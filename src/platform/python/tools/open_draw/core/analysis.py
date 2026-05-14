"""
Graph Analysis - Cycle Detection and Shortest Path using NetworkX
"""

from typing import Dict, Any, List, Tuple, Optional


def _try_import_networkx():
    """Attempt to import networkx, return None if not available."""
    try:
        import networkx as nx

        return nx
    except ImportError:
        return None


class GraphAnalyzer:
    """
    Analyzer for graph properties like cycles and paths.
    Uses NetworkX when available.
    """

    def __init__(self):
        self.nx = _try_import_networkx()

    def detect_cycles(
        self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> Tuple[bool, List[List[str]]]:
        """
        Detect cycles in a directed graph.

        Args:
            nodes: List of node dictionaries.
            edges: List of edge dictionaries.

        Returns:
            Tuple of (has_cycles: bool, cycles: List of node ID lists)
        """
        node_ids = [n["id"] for n in nodes]
        edge_pairs = [(e["source"], e["target"]) for e in edges]

        if self.nx:
            return self._nx_detect_cycles(node_ids, edge_pairs)
        else:
            return self._simple_detect_cycles(node_ids, edge_pairs)

    def _nx_detect_cycles(
        self, node_ids: List[str], edges: List[Tuple[str, str]]
    ) -> Tuple[bool, List[List[str]]]:
        """NetworkX-based cycle detection."""
        nx = self.nx
        G = nx.DiGraph()
        G.add_nodes_from(node_ids)
        G.add_edges_from(edges)

        try:
            cycles = list(nx.simple_cycles(G))
            return len(cycles) > 0, cycles
        except Exception:
            return False, []

    def _simple_detect_cycles(
        self, node_ids: List[str], edges: List[Tuple[str, str]]
    ) -> Tuple[bool, List[List[str]]]:
        """Simple DFS-based cycle detection without NetworkX."""
        # Build adjacency list
        graph: Dict[str, List[str]] = {n: [] for n in node_ids}
        for source, target in edges:
            if source in graph:
                graph[source].append(target)

        cycles = []
        visited = set()
        rec_stack = set()
        path = []

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    # Found a cycle
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                    return True

            path.pop()
            rec_stack.remove(node)
            return False

        for node in node_ids:
            if node not in visited:
                dfs(node)

        return len(cycles) > 0, cycles

    def shortest_path(
        self,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        source_id: str,
        target_id: str,
    ) -> Tuple[Optional[List[str]], Optional[int]]:
        """
        Find the shortest path between two nodes.

        Args:
            nodes: List of node dictionaries.
            edges: List of edge dictionaries.
            source_id: Starting node ID.
            target_id: Ending node ID.

        Returns:
            Tuple of (path as list of node IDs, path length) or (None, None) if no path.
        """
        node_ids = [n["id"] for n in nodes]
        edge_pairs = [(e["source"], e["target"]) for e in edges]

        if source_id not in node_ids or target_id not in node_ids:
            return None, None

        if self.nx:
            return self._nx_shortest_path(node_ids, edge_pairs, source_id, target_id)
        else:
            return self._simple_shortest_path(
                node_ids, edge_pairs, source_id, target_id
            )

    def _nx_shortest_path(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        source_id: str,
        target_id: str,
    ) -> Tuple[Optional[List[str]], Optional[int]]:
        """NetworkX-based shortest path."""
        nx = self.nx
        G = nx.DiGraph()
        G.add_nodes_from(node_ids)
        G.add_edges_from(edges)

        try:
            path = nx.shortest_path(G, source=source_id, target=target_id)
            return path, len(path) - 1
        except nx.NetworkXNoPath:
            return None, None
        except nx.NodeNotFound:
            return None, None

    def _simple_shortest_path(
        self,
        node_ids: List[str],
        edges: List[Tuple[str, str]],
        source_id: str,
        target_id: str,
    ) -> Tuple[Optional[List[str]], Optional[int]]:
        """Simple BFS-based shortest path without NetworkX."""
        # Build adjacency list
        graph: Dict[str, List[str]] = {n: [] for n in node_ids}
        for source, target in edges:
            if source in graph:
                graph[source].append(target)

        # BFS
        visited = {source_id}
        queue = [(source_id, [source_id])]

        while queue:
            current, path = queue.pop(0)

            if current == target_id:
                return path, len(path) - 1

            for neighbor in graph.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return None, None

    def get_connected_components(
        self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]
    ) -> List[List[str]]:
        """
        Find connected components in the graph (treating it as undirected).

        Returns:
            List of components, each a list of node IDs.
        """
        node_ids = [n["id"] for n in nodes]
        edge_pairs = [(e["source"], e["target"]) for e in edges]

        if self.nx:
            nx = self.nx
            G = nx.Graph()
            G.add_nodes_from(node_ids)
            G.add_edges_from(edge_pairs)
            return [list(c) for c in nx.connected_components(G)]
        else:
            # Simple union-find based approach
            parent: Dict[str, str] = {n: n for n in node_ids}

            def find(x: str) -> str:
                if parent[x] != x:
                    parent[x] = find(parent[x])
                return parent[x]

            def union(x: str, y: str):
                px, py = find(x), find(y)
                if px != py:
                    parent[px] = py

            for source, target in edge_pairs:
                if source in parent and target in parent:
                    union(source, target)

            # Group by root
            components: Dict[str, List[str]] = {}
            for node in node_ids:
                root = find(node)
                if root not in components:
                    components[root] = []
                components[root].append(node)

            return list(components.values())
