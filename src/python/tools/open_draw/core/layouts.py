"""
Layout Engine - Smart Auto-Layout Algorithms using NetworkX
Implements hierarchical (Sugiyama), circular, and spring (force-directed) layouts.
"""

from typing import Dict, Any, List, Tuple
import math


def _try_import_networkx():
    """Attempt to import networkx, return None if not available."""
    try:
        import networkx as nx

        return nx
    except ImportError:
        return None


class LayoutEngine:
    """
    Layout engine that applies various graph layout algorithms.
    Uses NetworkX when available, falls back to simple layouts otherwise.
    """

    def __init__(self):
        self.nx = _try_import_networkx()

    def apply_layout(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        algorithm: str = "hierarchical",
        **options
    ) -> List[Dict[str, Any]]:
        """
        Apply a layout algorithm to position nodes.

        Args:
            nodes: List of node dictionaries with 'id', 'position', etc.
            edges: List of edge dictionaries with 'source', 'target'.
            algorithm: One of 'hierarchical', 'circular', 'spring'.
            **options: Algorithm-specific options.

        Returns:
            Updated nodes with new positions.
        """
        if not nodes:
            return nodes

        # Extract node IDs for building the graph
        node_ids = [n["id"] for n in nodes]
        edge_pairs = [(e["source"], e["target"]) for e in edges]

        # Calculate positions based on algorithm
        if algorithm == "hierarchical":
            positions = self._hierarchical_layout(node_ids, edge_pairs, **options)
        elif algorithm == "circular":
            positions = self._circular_layout(node_ids, **options)
        elif algorithm == "spring":
            positions = self._spring_layout(node_ids, edge_pairs, **options)
        else:
            # Default to grid layout
            positions = self._grid_layout(node_ids, **options)

        # Update node positions
        result = []
        for node in nodes:
            updated_node = node.copy()
            if node["id"] in positions:
                updated_node["position"] = positions[node["id"]]
            result.append(updated_node)

        return result

    def _hierarchical_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        spacing_x: float = 200,
        spacing_y: float = 150,
        **kwargs
    ) -> Dict[str, Dict[str, float]]:
        """
        Hierarchical (Sugiyama-style) layout.
        Arranges nodes in layers based on their dependencies.
        """
        if self.nx:
            return self._nx_hierarchical_layout(node_ids, edges, spacing_x, spacing_y)
        else:
            return self._simple_hierarchical_layout(
                node_ids, edges, spacing_x, spacing_y
            )

    def _nx_hierarchical_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        spacing_x: float,
        spacing_y: float,
    ) -> Dict[str, Dict[str, float]]:
        """NetworkX-based hierarchical layout."""
        nx = self.nx
        G = nx.DiGraph()
        G.add_nodes_from(node_ids)
        G.add_edges_from(edges)

        # Find roots (nodes with no incoming edges)
        roots = [n for n in G.nodes() if G.in_degree(n) == 0]
        if not roots:
            roots = [node_ids[0]] if node_ids else []

        # Assign layers using BFS from roots
        layers: Dict[str, int] = {}
        visited = set()
        queue = [(r, 0) for r in roots]

        while queue:
            node, layer = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            layers[node] = max(layers.get(node, 0), layer)

            for successor in G.successors(node):
                queue.append((successor, layer + 1))

        # Handle disconnected nodes
        for node in node_ids:
            if node not in layers:
                layers[node] = 0

        # Group nodes by layer
        layer_nodes: Dict[int, List[str]] = {}
        for node, layer in layers.items():
            if layer not in layer_nodes:
                layer_nodes[layer] = []
            layer_nodes[layer].append(node)

        # Calculate positions
        positions = {}
        for layer, nodes_in_layer in layer_nodes.items():
            layer_width = len(nodes_in_layer) * spacing_x
            start_x = -layer_width / 2 + spacing_x / 2

            for i, node in enumerate(sorted(nodes_in_layer)):
                positions[node] = {"x": start_x + i * spacing_x, "y": layer * spacing_y}

        return positions

    def _simple_hierarchical_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        spacing_x: float,
        spacing_y: float,
    ) -> Dict[str, Dict[str, float]]:
        """Simple hierarchical layout without NetworkX."""
        # Build adjacency list
        children: Dict[str, List[str]] = {n: [] for n in node_ids}
        parents: Dict[str, List[str]] = {n: [] for n in node_ids}

        for source, target in edges:
            if source in children and target in node_ids:
                children[source].append(target)
                parents[target].append(source)

        # Find roots
        roots = [n for n in node_ids if not parents[n]]
        if not roots:
            roots = [node_ids[0]] if node_ids else []

        # BFS to assign layers
        layers: Dict[str, int] = {}
        visited = set()
        queue = [(r, 0) for r in roots]

        while queue:
            node, layer = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            layers[node] = max(layers.get(node, 0), layer)

            for child in children.get(node, []):
                queue.append((child, layer + 1))

        # Handle disconnected
        for node in node_ids:
            if node not in layers:
                layers[node] = 0

        # Group and position
        layer_nodes: Dict[int, List[str]] = {}
        for node, layer in layers.items():
            if layer not in layer_nodes:
                layer_nodes[layer] = []
            layer_nodes[layer].append(node)

        positions = {}
        for layer, nodes_in_layer in layer_nodes.items():
            layer_width = len(nodes_in_layer) * spacing_x
            start_x = -layer_width / 2 + spacing_x / 2

            for i, node in enumerate(sorted(nodes_in_layer)):
                positions[node] = {"x": start_x + i * spacing_x, "y": layer * spacing_y}

        return positions

    def _circular_layout(
        self, node_ids: List[str], radius: float = 300, **kwargs
    ) -> Dict[str, Dict[str, float]]:
        """Arrange nodes in a circle."""
        positions = {}
        n = len(node_ids)

        if n == 0:
            return positions

        if n == 1:
            positions[node_ids[0]] = {"x": 0, "y": 0}
            return positions

        for i, node_id in enumerate(node_ids):
            angle = (2 * math.pi * i) / n - math.pi / 2  # Start from top
            positions[node_id] = {
                "x": radius * math.cos(angle),
                "y": radius * math.sin(angle),
            }

        return positions

    def _spring_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        iterations: int = 50,
        k: float = 200,
        **kwargs
    ) -> Dict[str, Dict[str, float]]:
        """
        Spring (force-directed) layout.
        Uses attraction/repulsion forces to position nodes.
        """
        if self.nx:
            return self._nx_spring_layout(node_ids, edges, iterations, k)
        else:
            return self._simple_spring_layout(node_ids, edges, iterations, k)

    def _nx_spring_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        iterations: int,
        k: float,
    ) -> Dict[str, Dict[str, float]]:
        """NetworkX-based spring layout."""
        nx = self.nx
        G = nx.Graph()
        G.add_nodes_from(node_ids)
        G.add_edges_from(edges)

        pos = nx.spring_layout(G, k=k / 100, iterations=iterations, scale=k)

        return {
            node_id: {"x": float(coords[0] * k), "y": float(coords[1] * k)}
            for node_id, coords in pos.items()
        }

    def _simple_spring_layout(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        iterations: int,
        k: float,
    ) -> Dict[str, Dict[str, float]]:
        """Simple force-directed layout without NetworkX."""
        import random

        # Initialize random positions
        positions = {
            node_id: {"x": random.uniform(-k, k), "y": random.uniform(-k, k)}
            for node_id in node_ids
        }

        # Build edge set for quick lookup
        edge_set = set(edges)

        for _ in range(iterations):
            forces = {node_id: {"x": 0, "y": 0} for node_id in node_ids}

            # Repulsion between all nodes
            for i, n1 in enumerate(node_ids):
                for n2 in node_ids[i + 1 :]:
                    dx = positions[n1]["x"] - positions[n2]["x"]
                    dy = positions[n1]["y"] - positions[n2]["y"]
                    dist = max(math.sqrt(dx * dx + dy * dy), 1)

                    force = (k * k) / (dist * dist)
                    fx = (dx / dist) * force
                    fy = (dy / dist) * force

                    forces[n1]["x"] += fx
                    forces[n1]["y"] += fy
                    forces[n2]["x"] -= fx
                    forces[n2]["y"] -= fy

            # Attraction along edges
            for source, target in edges:
                if source in positions and target in positions:
                    dx = positions[target]["x"] - positions[source]["x"]
                    dy = positions[target]["y"] - positions[source]["y"]
                    dist = max(math.sqrt(dx * dx + dy * dy), 1)

                    force = (dist * dist) / k
                    fx = (dx / dist) * force
                    fy = (dy / dist) * force

                    forces[source]["x"] += fx * 0.5
                    forces[source]["y"] += fy * 0.5
                    forces[target]["x"] -= fx * 0.5
                    forces[target]["y"] -= fy * 0.5

            # Apply forces with damping
            damping = 0.1
            for node_id in node_ids:
                positions[node_id]["x"] += forces[node_id]["x"] * damping
                positions[node_id]["y"] += forces[node_id]["y"] * damping

        return positions

    def _grid_layout(
        self, node_ids: List[str], spacing: float = 150, columns: int = 5, **kwargs
    ) -> Dict[str, Dict[str, float]]:
        """Simple grid layout as fallback."""
        positions = {}

        for i, node_id in enumerate(node_ids):
            row = i // columns
            col = i % columns
            positions[node_id] = {"x": col * spacing, "y": row * spacing}

        return positions
