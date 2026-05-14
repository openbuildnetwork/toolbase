"""
Diagram Parsers - Mermaid and XML (Visio-like) format parsers.
Converts external formats to our internal graph schema.
"""

from typing import Dict, Any, List, Tuple
import re
import uuid


def _generate_id() -> str:
    """Generate a unique ID for nodes/edges."""
    return str(uuid.uuid4())[:8]


class MermaidParser:
    """
    Parser for Mermaid flowchart/graph syntax.
    Supports basic flowchart syntax like:

    graph TD
        A[Start] --> B{Is it?}
        B -->|Yes| C[OK]
        B -->|No| D[End]
    """

    def parse(self, content: str) -> Dict[str, Any]:
        """
        Parse Mermaid diagram syntax.

        Args:
            content: Mermaid diagram string.

        Returns:
            Graph dictionary with nodes and edges.
        """
        lines = content.strip().split("\n")
        nodes: Dict[str, Dict[str, Any]] = {}
        edges: List[Dict[str, Any]] = []

        # Default direction
        direction = "TD"  # Top-Down

        for line in lines:
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith("%%"):
                continue

            # Parse graph declaration
            if line.lower().startswith("graph ") or line.lower().startswith(
                "flowchart "
            ):
                parts = line.split()
                if len(parts) > 1:
                    direction = parts[1].upper()
                continue

            # Parse node and edge definitions
            # Pattern: A[Label] --> B[Label]
            # Or: A --> B
            # Or: A -->|EdgeLabel| B

            # First, try to extract connections
            connection_pattern = (
                r"(\w+)(?:\[([^\]]*)\]|\{([^\}]*)\}|\(\(([^\)]*)\)\)|\(([^\)]*)\))?"
            )
            arrow_pattern = r"(-->|---|===|-.->|-.-|-->"

            # Simplified parsing - look for arrows
            if "-->" in line or "---" in line or "===" in line:
                parsed = self._parse_connection_line(line, nodes)
                if parsed:
                    edges.append(parsed)
            else:
                # Maybe a standalone node definition
                self._parse_standalone_node(line, nodes)

        # Convert nodes dict to list and assign positions
        node_list = self._position_nodes(list(nodes.values()), direction)

        return {
            "nodes": node_list,
            "edges": edges,
        }

    def _parse_connection_line(
        self, line: str, nodes: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any] | None:
        """Parse a line containing a connection (arrow)."""
        # Split by arrow variations
        arrow_match = re.search(r"(-->|---|===|-\.->|--o|--x)", line)
        if not arrow_match:
            return None

        arrow = arrow_match.group(1)
        parts = re.split(r"-->|---|===|-\.->|--o|--x", line)

        if len(parts) < 2:
            return None

        # Parse source and target
        source_part = parts[0].strip()
        target_part = parts[1].strip()

        # Extract edge label if present (|label|)
        edge_label = None
        label_match = re.search(r"\|([^\|]*)\|", target_part)
        if label_match:
            edge_label = label_match.group(1)
            target_part = re.sub(r"\|[^\|]*\|", "", target_part).strip()

        # Parse source node
        source_id, source_label, source_type = self._parse_node_def(source_part)
        if source_id not in nodes:
            nodes[source_id] = {
                "id": source_id,
                "type": source_type,
                "position": {"x": 0, "y": 0},
                "data": {"label": source_label},
            }

        # Parse target node
        target_id, target_label, target_type = self._parse_node_def(target_part)
        if target_id not in nodes:
            nodes[target_id] = {
                "id": target_id,
                "type": target_type,
                "position": {"x": 0, "y": 0},
                "data": {"label": target_label},
            }

        edge = {
            "id": f"e-{source_id}-{target_id}",
            "source": source_id,
            "target": target_id,
            "type": "smoothstep",
            "animated": False,
        }

        if edge_label:
            edge["label"] = edge_label

        return edge

    def _parse_node_def(self, node_str: str) -> Tuple[str, str, str]:
        """
        Parse a node definition string.
        Returns (id, label, type)
        """
        node_str = node_str.strip()

        # Rectangle: A[Label] or A["Label"]
        rect_match = re.match(r"^(\w+)\[([^\]]*)\]$", node_str)
        if rect_match:
            return rect_match.group(1), rect_match.group(2).strip("\"'"), "rectangle"

        # Diamond: A{Label}
        diamond_match = re.match(r"^(\w+)\{([^\}]*)\}$", node_str)
        if diamond_match:
            return (
                diamond_match.group(1),
                diamond_match.group(2).strip("\"'"),
                "diamond",
            )

        # Circle: A((Label))
        circle_match = re.match(r"^(\w+)\(\(([^\)]*)\)\)$", node_str)
        if circle_match:
            return circle_match.group(1), circle_match.group(2).strip("\"'"), "circle"

        # Rounded: A(Label)
        rounded_match = re.match(r"^(\w+)\(([^\)]*)\)$", node_str)
        if rounded_match:
            return (
                rounded_match.group(1),
                rounded_match.group(2).strip("\"'"),
                "rectangle",
            )

        # Plain ID (no shape brackets)
        id_match = re.match(r"^(\w+)$", node_str)
        if id_match:
            node_id = id_match.group(1)
            return node_id, node_id, "rectangle"

        # Fallback
        return node_str, node_str, "rectangle"

    def _parse_standalone_node(self, line: str, nodes: Dict[str, Dict[str, Any]]):
        """Parse a standalone node definition (no connection)."""
        node_id, label, node_type = self._parse_node_def(line)
        if node_id and node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "type": node_type,
                "position": {"x": 0, "y": 0},
                "data": {"label": label},
            }

    def _position_nodes(
        self, nodes: List[Dict[str, Any]], direction: str
    ) -> List[Dict[str, Any]]:
        """Assign initial positions based on order and direction."""
        spacing = 150

        for i, node in enumerate(nodes):
            if direction in ["TD", "TB"]:
                node["position"] = {"x": 0, "y": i * spacing}
            elif direction == "LR":
                node["position"] = {"x": i * spacing, "y": 0}
            elif direction == "BT":
                node["position"] = {"x": 0, "y": -i * spacing}
            elif direction == "RL":
                node["position"] = {"x": -i * spacing, "y": 0}
            else:
                node["position"] = {"x": (i % 5) * spacing, "y": (i // 5) * spacing}

        return nodes


class XMLParser:
    """
    Parser for XML-based diagram formats (Visio-like, draw.io XML).
    Supports:
    - Plain mxGraphModel XML
    - Compresed draw.io XML (mxfile -> diagram -> base64+deflate)
    """

    def parse(self, content: str) -> Dict[str, Any]:
        """
        Parse XML diagram content.

        Args:
            content: XML string.

        Returns:
            Graph dictionary with nodes and edges.
        """
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        try:
            # Check if this is a compressed draw.io file
            if "<mxfile" in content:
                content = self._decode_drawio(content)

            # Now we have plain mxGraphModel XML
            # Proceed with extracting cells

            # Regex to find all mxCell tags
            # We use a robust pattern to capture attributes
            cell_iter = re.finditer(r"<mxCell\s+(?P<attrs>[^>]*)>", content)

            for match in cell_iter:
                attrs_str = match.group("attrs")

                # Extract ID
                id_match = re.search(r'id="([^"]*)"', attrs_str)
                if not id_match:
                    continue
                cell_id = id_match.group(1)

                # Extract Value (Label)
                value_match = re.search(r'value="([^"]*)"', attrs_str)
                label = value_match.group(1) if value_match else ""
                label = self._decode_html_entities(label)

                # Check type
                is_edge = 'edge="1"' in attrs_str
                is_vertex = 'vertex="1"' in attrs_str

                style_match = re.search(r'style="([^"]*)"', attrs_str)
                style = style_match.group(1) if style_match else ""

                if is_vertex:
                    # Determine shape from style
                    node_type = "rectangle"
                    if "ellipse" in style:
                        node_type = "circle"
                    elif "rhombus" in style:
                        node_type = "diamond"
                    elif "text" in style and "shape" not in style:
                        node_type = "text"
                    elif "shape=cylinder" in style:
                        node_type = "cylinder"
                    elif "shape=cloud" in style:
                        node_type = "cloud"
                    elif "shape=actor" in style:
                        node_type = "actor"
                    elif "shape=note" in style or "shape=document" in style:
                        node_type = "document"
                    elif "shape=parallelogram" in style:
                        node_type = "parallelogram"
                    elif "triangle" in style:
                        node_type = "triangle"

                    # Find geometry
                    # Try to look ahead for mxGeometry matching this cell
                    # Simplified assumption: mxGeometry is immediately inside the mxCell tag
                    # But since we use regex on self-closing or open tags, we check
                    # if the cell is NOT self-closing (doesn't end with /)
                    x, y, w, h = 0, 0, 120, 80

                    # If this match was NOT self-closing "/>", we might find geometry inside
                    if not match.group(0).strip().endswith("/>"):
                        # scan forward until </mxCell>
                        start_pos = match.end()
                        end_pos = content.find("</mxCell>", start_pos)
                        if end_pos != -1:
                            inner = content[start_pos:end_pos]
                            geo_match = re.search(r"<mxGeometry[^>]*>", inner)
                            if geo_match:
                                geo_attrs = geo_match.group(0)
                                x_m = re.search(r'x="([^"]*)"', geo_attrs)
                                y_m = re.search(r'y="([^"]*)"', geo_attrs)
                                w_m = re.search(r'width="([^"]*)"', geo_attrs)
                                h_m = re.search(r'height="([^"]*)"', geo_attrs)

                                if x_m:
                                    x = float(x_m.group(1))
                                if y_m:
                                    y = float(y_m.group(1))
                                if w_m:
                                    w = float(w_m.group(1))
                                if h_m:
                                    h = float(h_m.group(1))

                    nodes.append(
                        {
                            "id": cell_id,
                            "type": node_type,
                            "position": {"x": x, "y": y},
                            "width": w,
                            "height": h,
                            "data": {"label": label or node_type},
                        }
                    )

                elif is_edge:
                    source_match = re.search(r'source="([^"]*)"', attrs_str)
                    target_match = re.search(r'target="([^"]*)"', attrs_str)

                    if source_match and target_match:
                        edges.append(
                            {
                                "id": cell_id,
                                "source": source_match.group(1),
                                "target": target_match.group(1),
                                "type": "smoothstep",
                                "animated": False,
                                "label": label if label else None,
                            }
                        )

        except Exception as e:
            # Return error structure that TS can interpret
            return {"nodes": [], "edges": [], "error": f"Parse error: {str(e)}"}

        return {"nodes": nodes, "edges": edges}

    def _decode_drawio(self, content: str) -> str:
        """Decode compressed draw.io XML content."""
        import base64
        import zlib
        from urllib.parse import unquote

        # 1. Extract base64 content from <diagram> tag
        match = re.search(r"<diagram[^>]*>([^<]+)</diagram>", content)
        if not match:
            return content  # Fallback to assuming it's uncompressed

        b64_data = match.group(1).strip()

        try:
            # 2. Base64 Decode
            compressed_data = base64.b64decode(b64_data)

            # 3. Inflate (Raw Deflate - no header)
            # -15 tells zlib to treat it as raw deflate stream
            xml_data = zlib.decompress(compressed_data, -15)

            # 4. URL Decode (draw.io compresses URL-encoded XML)
            xml_str = unquote(xml_data.decode("utf-8"))

            return xml_str
        except Exception:
            # If decoding fails, return original content
            return content

    def _decode_html_entities(self, text: str) -> str:
        """Decode common HTML entities."""
        replacements = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": '"',
            "&#39;": "'",
            "&nbsp;": " ",
            "<br>": "\n",
            "<br/>": "\n",
            "<br />": "\n",
        }

        for entity, char in replacements.items():
            text = text.replace(entity, char)

        # Remove remaining HTML tags
        text = re.sub(r"<[^>]+>", "", text)

        return text
