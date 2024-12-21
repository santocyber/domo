<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json'); // Garantir que o retorno seja JSON

    $radius = isset($_POST['radius']) ? floatval($_POST['radius']) : 0;
    $frequency = isset($_POST['subdivision']) ? intval($_POST['subdivision']) : 0;

    if ($radius <= 0 || $frequency < 1 || $frequency > 6) {
        echo json_encode([
            'error' => 'Parâmetros inválidos. Verifique o raio e a frequência (1 a 6).'
        ]);
        exit;
    }

    // Função para calcular a distância entre dois pontos
    function calculateDistance($x1, $y1, $z1, $x2, $y2, $z2) {
        return sqrt(pow($x2 - $x1, 2) + pow($y2 - $y1, 2) + pow($z2 - $z1, 2));
    }

    try {
        // Gerar os vértices e arestas da geodésica
        $icosahedron = new IcosahedronGeometry($radius, $frequency);
        $vertices = $icosahedron->getVertices();
        $edges = $icosahedron->getEdges();

        // Calcular comprimentos das arestas e agrupar por tipo
        $edgeLengths = [];
        $edgeTypes = [];
        foreach ($edges as $edge) {
            [$start, $end] = $edge;
            $length = calculateDistance(
                $vertices[$start][0], $vertices[$start][1], $vertices[$start][2],
                $vertices[$end][0], $vertices[$end][1], $vertices[$end][2]
            );
            $edgeLengths[] = $length;

            $roundedLength = round($length, 3);
            if (!isset($edgeTypes[$roundedLength])) {
                $edgeTypes[$roundedLength] = 0;
            }
            $edgeTypes[$roundedLength]++;
        }

        // Calcular conectores
        $connectors = [
            '4-vias' => 15, // Exemplo
            '5-vias' => 6, // Exemplo
            '6-vias' => 25 // Exemplo
        ];

        // Responder com os dados calculados
        echo json_encode([
            'vertexCount' => count($vertices),
            'edgeCount' => count($edges),
            'edgeTypes' => $edgeTypes,
            'connectors' => $connectors
        ]);
        exit;
    } catch (Exception $e) {
        echo json_encode([
            'error' => 'Erro no cálculo: ' . $e->getMessage()
        ]);
        exit;
    }
}

class IcosahedronGeometry {
    private $vertices = [];
    private $edges = [];

    public function __construct($radius, $subdivision) {
        $this->generateIcosahedron($radius, $subdivision);
    }

    private function generateIcosahedron($radius, $subdivision) {
        // Implementação de geração de vértices e arestas do icosaedro
        // incluindo subdivisão conforme necessário.

        // Exemplo simplificado: (adicione os vértices e arestas reais)
        $this->vertices = [
            [0, $radius, 0], // Ponto no topo
            [$radius, 0, 0], // Outros vértices
            // ... mais vértices
        ];

        $this->edges = [
            [0, 1], // Definir as conexões entre vértices
            [1, 2],
            // ... mais arestas
        ];
    }

    public function getVertices() {
        return $this->vertices;
    }

    public function getEdges() {
        return $this->edges;
    }
}
?>
