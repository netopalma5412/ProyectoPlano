let graphNodes = null;
let mapCoords = null;
const MAX_DEVIATION_DISTANCE = 12;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [graphRes, mapRes] = await Promise.all([
            fetch('data/graph-data.json'),
            fetch('data/map-data.json')
        ]);
        graphNodes = await graphRes.json();
        mapCoords = await mapRes.json();
        
        console.log('Routing data loaded. Graph nodes:', Object.keys(graphNodes).length, 'Map coords:', Object.keys(mapCoords).length);
        window.routingReady = true;
        
        // Setup toggle button after data loads
        const btnToggleRoute = document.getElementById('btn-toggle-route');
        if(btnToggleRoute) {
            btnToggleRoute.addEventListener('click', () => {
                const routeOverlay = document.getElementById('route-layer');
                if (routeOverlay) {
                    routeOverlay.style.display = routeOverlay.style.display === 'none' ? 'block' : 'none';
                }
            });
        }

        // Draw route once data is loaded (wait briefly for SVG to be ready)
        await waitForSVGAndDrawRoute();
    } catch (error) {
        console.error("Error loading routing data", error);
    }
});

// Wait for SVG to be loaded by map-engine, then draw route
async function waitForSVGAndDrawRoute() {
    const maxRetries = 20;
    for (let i = 0; i < maxRetries; i++) {
        const svgElement = document.querySelector("#map-container svg");
        if (svgElement) {
            console.log('SVG found, drawing route...');
            await window.calculateAndDrawRoute();
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.warn('SVG not found after retries, route not drawn');
}

function calculateDistance(node1, node2) {
    return Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));
}

// Dynamically builds edges based on street sequences and intersections
function buildGraph() {
    const adjacencyList = {};
    const nodes = Object.keys(graphNodes);
    
    // Initialize adjacency list
    nodes.forEach(nodeId => {
        adjacencyList[nodeId] = [];
    });
    
    // Map to group nodes by street
    const streetNodes = {};
    
    // 1. Group nodes by street and parse out their numbers
    nodes.forEach(nodeId => {
        if (nodeId === 'puntoA' || nodeId === 'puntoB') return;
        
        // Split by '-' to handle intersections (e.g. A9-B1)
        const parts = nodeId.split('-');
        
        parts.forEach(part => {
            const match = part.match(/^([A-Z]+)(\d+)$/);
            if (match) {
                const street = match[1];
                const number = parseInt(match[2], 10);
                
                if (!streetNodes[street]) {
                    streetNodes[street] = [];
                }
                
                streetNodes[street].push({
                    id: nodeId,
                    num: number
                });
            }
        });
    });
    
    // 2. Connect contiguous nodes within the same street
    for (const street in streetNodes) {
        // Sort ascending by street number
        streetNodes[street].sort((a, b) => a.num - b.num);
        
        for (let i = 0; i < streetNodes[street].length - 1; i++) {
            const node1 = streetNodes[street][i].id;
            const node2 = streetNodes[street][i + 1].id;
            
            // Only connect if they are not the exactly same node (no self loops)
            // difference between numbers can be > 1 if some are skipped, but we 
            // connect them sequentially anyway to form a continuous line.
            if (node1 !== node2) {
                const dist = calculateDistance(graphNodes[node1], graphNodes[node2]);
                
                // Push mutual connection if not already there
                if (!adjacencyList[node1].find(n => n.node === node2)) {
                    adjacencyList[node1].push({ node: node2, weight: dist });
                }
                if (!adjacencyList[node2].find(n => n.node === node1)) {
                    adjacencyList[node2].push({ node: node1, weight: dist });
                }
            }
        }
    }
    
    // 3. Connect puntoA and puntoB to their closest graph node
    ['puntoA', 'puntoB'].forEach(endpoint => {
        if (!graphNodes[endpoint]) return;
        
        let closestNode = null;
        let minDist = Infinity;
        
        nodes.forEach(targetId => {
            if (targetId !== 'puntoA' && targetId !== 'puntoB') {
                const dist = calculateDistance(graphNodes[endpoint], graphNodes[targetId]);
                if (dist < minDist) {
                    minDist = dist;
                    closestNode = targetId;
                }
            }
        });
        
        if (closestNode) {
            adjacencyList[endpoint].push({ node: closestNode, weight: minDist });
            adjacencyList[closestNode].push({ node: endpoint, weight: minDist });
        }
    });

    return adjacencyList;
}

// Basic Dijkstra's Algorithm implementation
function dijkstra(graph, startNode, endNode) {
    let distances = {};
    let prev = {};
    let pq = new PriorityQueue();
    
    for (let node in graph) {
        distances[node] = Infinity;
        prev[node] = null;
    }
    
    distances[startNode] = 0;
    pq.enqueue(startNode, 0);
    
    while (!pq.isEmpty()) {
        let minNode = pq.dequeue().element;
        
        if (minNode === endNode) {
            let path = [];
            let curr = endNode;
            while (curr) {
                path.push(curr);
                curr = prev[curr];
            }
            return path.reverse();
        }
        
        graph[minNode].forEach(neighbor => {
            let alt = distances[minNode] + neighbor.weight;
            if (alt < distances[neighbor.node]) {
                distances[neighbor.node] = alt;
                prev[neighbor.node] = minNode;
                pq.enqueue(neighbor.node, alt);
            }
        });
    }
    return [];
}

// Simplified Priority Queue for Dijkstra
class PriorityQueue {
    constructor() {
        this.items = [];
    }
    enqueue(element, priority) {
        var qElement = { element, priority };
        var added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > qElement.priority) {
                this.items.splice(i, 0, qElement);
                added = true;
                break;
            }
        }
        if (!added) {
            this.items.push(qElement);
        }
    }
    dequeue() {
        return this.items.shift();
    }
    isEmpty() {
        return this.items.length === 0;
    }
}

// Main Routing Function exposed to window so map-engine can call it
window.calculateAndDrawRoute = async function() {
    console.log('calculateAndDrawRoute called. graphNodes:', !!graphNodes, 'mapCoords:', !!mapCoords);
    if (!graphNodes || !mapCoords) {
        console.warn('Route data not loaded yet, skipping route draw');
        return;
    }
    
    const svgElement = document.querySelector("#map-container svg");
    if (!svgElement) {
        console.warn('SVG element not found, skipping route draw');
        return;
    }

    // Get active houses
    const { data: activeHouses } = await window.supabaseClient
        .from('viviendas')
        .select('id')
        .eq('estado', true);

    const activeHouseIds = activeHouses ? activeHouses.map(h => h.id) : [];
    console.log('Active houses for route:', activeHouseIds);

    const graph = buildGraph();
    console.log('Graph built with', Object.keys(graph).length, 'nodes');
    
    // We start with Base Route A to B
    let waypoints = ['puntoA'];
    
    // Simplification for deviation: find the closest graph node to each active house
    // In a real advanced TSP-like scenario, we would re-order houses to minimize detour.
    // For now, we collect nodes we MUST visit based on the houses.
    let nodesToVisit = [];
    activeHouseIds.forEach(houseId => {
        const houseData = mapCoords[houseId];
        if (houseData) {
            let closestGraphNode = null;
            let minDist = Infinity;
            
            for (const [nodeId, nodeData] of Object.entries(graphNodes)) {
                const dist = calculateDistance(houseData, nodeData);
                if (dist < minDist) {
                    minDist = dist;
                    closestGraphNode = nodeId;
                }
            }
            
            // Deviate if within max units, but actually we force passing near it
            if (closestGraphNode && !nodesToVisit.find(n => n.graphNodeId === closestGraphNode)) {
                nodesToVisit.push({ graphNodeId: closestGraphNode, houseData });
                console.log('House', houseId, '-> closest graph node:', closestGraphNode, 'dist:', minDist.toFixed(1));
            }
        }
    });

    // Determine segments (To keep it simple, we just route A -> closest house -> next closest -> B)
    let currentStart = 'puntoA';
    let fullPath = [];
    
    // Very basic nearest neighbor sort for waypoints
    while(nodesToVisit.length > 0) {
        // find node closest to currentStart
        let nearestNodeIdx = 0;
        let p1 = graphNodes[currentStart];
        let minDist = Infinity;
        
        nodesToVisit.forEach((target, index) => {
            let p2 = graphNodes[target.graphNodeId];
            let dist = calculateDistance(p1, p2);
            if (dist < minDist) {
                minDist = dist;
                nearestNodeIdx = index;
            }
        });
        
        let target = nodesToVisit.splice(nearestNodeIdx, 1)[0];
        let pathSegment = dijkstra(graph, currentStart, target.graphNodeId);
        console.log('Path segment', currentStart, '->', target.graphNodeId, ':', pathSegment.length, 'nodes');
        
        // Remove overlap (last node of segment is start of next)
        if (fullPath.length > 0 && pathSegment.length > 0) pathSegment.shift(); 
        fullPath = fullPath.concat(pathSegment);
        
        currentStart = target.graphNodeId;
    }
    
    // Finally, route to PuntoB
    let finalSegment = dijkstra(graph, currentStart, 'puntoB');
    if (fullPath.length > 0 && finalSegment.length > 0) finalSegment.shift();
    fullPath = fullPath.concat(finalSegment);
    console.log('Full route path:', fullPath.length, 'nodes');

    // Render path
    drawPathOnSVG(svgElement, fullPath, activeHouseIds);
}

function drawPathOnSVG(svg, pathNodes, activeHouseIds) {
    // Find the svg-pan-zoom viewport <g> element — the route MUST be inside it
    // so it pans and zooms with the map content
    let viewport = svg.querySelector('.svg-pan-zoom_viewport');
    if (!viewport) {
        // Fallback: try to find the main content group
        viewport = svg.querySelector('g');
    }
    if (!viewport) {
        console.error('No viewport found in SVG for route layer');
        viewport = svg; // Last resort fallback
    }

    // 1. Thoroughly remove any existing route layer or remnants
    const existingLayers = svg.querySelectorAll('#route-layer');
    existingLayers.forEach(el => el.remove());

    // If no houses are registered, don't draw anything (clean map)
    if (activeHouseIds.length === 0) {
        console.log('No registered houses, keeping route layer empty.');
        return;
    }

    const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    layer.setAttribute("id", "route-layer");
    viewport.appendChild(layer);

    // 2. Base route (puntoA -> puntoB) - User previously confused this with "old lines"
    // We only draw this if there are active houses to provide context.
    
    // 3. Draw active route solid (through registered houses) on top
    if (pathNodes.length >= 2) {
        let d = `M ${graphNodes[pathNodes[0]].x} ${graphNodes[pathNodes[0]].y}`;
        for (let i = 1; i < pathNodes.length; i++) {
            d += ` L ${graphNodes[pathNodes[i]].x} ${graphNodes[pathNodes[i]].y}`;
        }

        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", d);
        pathEl.setAttribute("stroke", "red"); 
        pathEl.setAttribute("stroke-width", "2");
        pathEl.setAttribute("fill", "none");
        pathEl.setAttribute("stroke-linejoin", "round");
        pathEl.setAttribute("stroke-linecap", "round");
        
        // Removed drop shadow to prevent "ghosting" artifacts on thin lines
        layer.appendChild(pathEl);
    }

    // 3. Draw Deviations to houses (perpendicular lines)
    activeHouseIds.forEach(houseId => {
        const house = mapCoords[houseId];
        if (house) {
            // Find closest path node
            let closestNode = pathNodes.length > 0 ? pathNodes[0] : null;
            let minDist = Infinity;
            const searchNodes = pathNodes.length > 0 ? pathNodes : Object.keys(graphNodes);
            searchNodes.forEach(nodeId => {
                if (graphNodes[nodeId]) {
                    const dist = calculateDistance(house, graphNodes[nodeId]);
                    if (dist < minDist) {
                        minDist = dist;
                        closestNode = nodeId;
                    }
                }
            });

            // Draw a solid red line from closest graph node to the house
            if (closestNode && graphNodes[closestNode]) {
                const devLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                devLine.setAttribute("x1", graphNodes[closestNode].x);
                devLine.setAttribute("y1", graphNodes[closestNode].y);
                devLine.setAttribute("x2", house.x);
                devLine.setAttribute("y2", house.y);
                devLine.setAttribute("stroke", "red");
                devLine.setAttribute("stroke-width", "2");
                layer.appendChild(devLine);
            }
        }
    });

    console.log('Route drawn with', pathNodes.length, 'nodes and', activeHouseIds.length, 'active houses');
}