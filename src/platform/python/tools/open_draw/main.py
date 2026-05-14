"""
OpenDraw - Graph Processing Engine
Main entry point for the Python worker.
"""

from typing import Dict, Any, List, Optional
import json

# Import core modules
from .core.layouts import LayoutEngine
from .core.analysis import GraphAnalyzer
from .core.parsers import MermaidParser, XMLParser


class OpenDrawEngine:
    """
    Main engine class that dispatches commands to appropriate handlers.
    Designed for use in a Pyodide Web Worker environment.
    """

    def __init__(self):
        self.layout_engine = LayoutEngine()
        self.analyzer = GraphAnalyzer()
        self.mermaid_parser = MermaidParser()
        self.xml_parser = XMLParser()

    def process(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main dispatcher for processing commands from the TypeScript frontend.

        Args:
            command: Dictionary containing 'type', 'id', and 'data' fields.

        Returns:
            Response dictionary with results or error.
        """
        try:
            cmd_type = command.get("type")
            cmd_id = command.get("id", "")
            data = command.get("data", {})

            if cmd_type == "AUTO_LAYOUT":
                return self._handle_auto_layout(cmd_id, data)
            elif cmd_type == "DETECT_CYCLES":
                return self._handle_detect_cycles(cmd_id, data)
            elif cmd_type == "SHORTEST_PATH":
                return self._handle_shortest_path(cmd_id, data)
            elif cmd_type == "PARSE_MERMAID":
                return self._handle_parse_mermaid(cmd_id, data)
            elif cmd_type == "PARSE_XML":
                return self._handle_parse_xml(cmd_id, data)
            else:
                return {
                    "type": "ERROR",
                    "id": cmd_id,
                    "error": f"Unknown command type: {cmd_type}",
                }
        except Exception as e:
            return {"type": "ERROR", "id": command.get("id", ""), "error": str(e)}

    def _handle_auto_layout(self, cmd_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply auto-layout algorithm to the graph."""
        graph = data.get("graph", {})
        algorithm = data.get("algorithm", "hierarchical")
        options = data.get("options") or {}  # Handle None explicitly

        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        laid_out_nodes = self.layout_engine.apply_layout(
            nodes=nodes, edges=edges, algorithm=algorithm, **options
        )

        return {
            "type": "AUTO_LAYOUT_RESULT",
            "id": cmd_id,
            "data": {"nodes": laid_out_nodes},
        }

    def _handle_detect_cycles(
        self, cmd_id: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect cycles in the graph."""
        graph = data.get("graph", {})
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        has_cycles, cycles = self.analyzer.detect_cycles(nodes, edges)

        return {
            "type": "DETECT_CYCLES_RESULT",
            "id": cmd_id,
            "data": {"hasCycles": has_cycles, "cycles": cycles},
        }

    def _handle_shortest_path(
        self, cmd_id: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Find shortest path between two nodes."""
        graph = data.get("graph", {})
        source_id = data.get("sourceId")
        target_id = data.get("targetId")

        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])

        path, length = self.analyzer.shortest_path(nodes, edges, source_id, target_id)

        return {
            "type": "SHORTEST_PATH_RESULT",
            "id": cmd_id,
            "data": {"path": path, "length": length},
        }

    def _handle_parse_mermaid(
        self, cmd_id: str, data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse Mermaid diagram syntax."""
        content = data.get("content", "")

        graph = self.mermaid_parser.parse(content)

        return {"type": "PARSE_RESULT", "id": cmd_id, "data": {"graph": graph}}

    def _handle_parse_xml(self, cmd_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse XML (Visio-like) diagram format."""
        content = data.get("content", "")

        graph = self.xml_parser.parse(content)

        return {"type": "PARSE_RESULT", "id": cmd_id, "data": {"graph": graph}}


# Global engine instance for the worker
_engine: Optional[OpenDrawEngine] = None


def get_engine() -> OpenDrawEngine:
    """Get or create the singleton engine instance."""
    global _engine
    if _engine is None:
        _engine = OpenDrawEngine()
    return _engine


def process_command(command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Entry point function called from the Web Worker.

    Args:
        command: Command dictionary from TypeScript.

    Returns:
        Response dictionary to send back.
    """
    engine = get_engine()
    return engine.process(command)


def handle_request(action: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Standardized entry point for Toolbase Python workers."""
    return process_command({"type": action, "data": data})

