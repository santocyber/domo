// Variáveis globais para exportação
let triangleGroups = {};
let edgeCounts = {};

 const edgeColors = {}; // Cores únicas para cada comprimento de lado


// Função para gerar e calcular diferentes tipos de geodésicas usando apenas JavaScript
const generateGeodesic = () => {
  const radius = parseFloat(document.getElementById('radius').value);
  const subdivision = parseInt(document.getElementById('subdivision').value);
  const geodesicType = document.getElementById('geodesicType').value;

  if (isNaN(radius) || radius <= 0 || isNaN(subdivision) || subdivision < 1 || subdivision > 6) {
    alert('Por favor, insira valores válidos!');
    return;
  }

  // Configurar as variáveis globais
  triangleGroups = {}; // Reiniciar as variáveis globais
  edgeCounts = {};
  
  // Configurar a cena 3D
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 500, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, 500);
  document.getElementById('3d-viewer').innerHTML = '';
  document.getElementById('3d-viewer').appendChild(renderer.domElement);

  // Variáveis para controle de zoom, animação e rotação
  let isAnimating = false;
  const rotation = { x: 0, y: 0 }; // Rotação inicial
  const rotationSpeed = 0.01; // Velocidade de rotação automática

  const controls = {
    zoomIn: () => camera.position.z -= radius * 0.1,
    zoomOut: () => camera.position.z += radius * 0.1,
    toggleAnimation: () => {
      isAnimating = !isAnimating;
      document.getElementById('toggleAnimation').textContent = isAnimating ? 'Parar Animação' : 'Iniciar Animação';
    },
    rotateLeft: () => rotation.y -= rotationSpeed,
    rotateRight: () => rotation.y += rotationSpeed,
    rotateUp: () => rotation.x -= rotationSpeed,
    rotateDown: () => rotation.x += rotationSpeed,
  };

  // Criar a geometria da geodésica
  const geometry = new THREE.IcosahedronGeometry(radius, subdivision);

  // Verificar e gerar índices, se necessário
  if (!geometry.index) {
    geometry.setIndex([...Array(geometry.attributes.position.count).keys()]);
  }

  const position = geometry.attributes.position;
  const indexArray = Array.from(geometry.index.array);
  const newIndices = [];



  for (let i = 0; i < indexArray.length; i += 3) {
    const v1 = indexArray[i];
    const v2 = indexArray[i + 1];
    const v3 = indexArray[i + 2];

    const y1 = position.array[v1 * 3 + 1];
    const y2 = position.array[v2 * 3 + 1];
    const y3 = position.array[v3 * 3 + 1];

    // Lógica de recorte para diferentes tipos de geodésicas (corte horizontal)
    let includeTriangle = false;
    if (geodesicType === 'sphere') {
      includeTriangle = true; // Incluir todos os triângulos
    } else {
      const cutoffAngle = parseInt(geodesicType.split('/')[0]) / 8;
      const cutoff = radius * Math.cos(cutoffAngle * Math.PI);
      includeTriangle = y1 >= cutoff && y2 >= cutoff && y3 >= cutoff;
    }

    if (includeTriangle) {
      newIndices.push(v1, v2, v3);

      // Calcular os comprimentos das arestas
      const vertices = [v1, v2, v3];
      const triangleEdges = [];
      const triangleVertices = [];
      for (let j = 0; j < vertices.length; j++) {
        const start = vertices[j];
        const end = vertices[(j + 1) % 3];

        const x1 = position.array[start * 3], y1 = position.array[start * 3 + 1], z1 = position.array[start * 3 + 2];
        const x2 = position.array[end * 3], y2 = position.array[end * 3 + 1], z2 = position.array[end * 3 + 2];

        const length = Math.sqrt(
          Math.pow(x2 - x1, 2) +
          Math.pow(y2 - y1, 2) +
          Math.pow(z2 - z1, 2)
        ).toFixed(3);

        triangleEdges.push(length);
        triangleVertices.push([x1, y1, z1]);

        // Contar lados iguais
        if (!edgeCounts[length]) {
          edgeCounts[length] = 0;
          edgeColors[length] = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Gerar cor única para este comprimento
        }
        edgeCounts[length]++;

        // Adicionar aresta ao desenho com a cor correspondente
        const edgeGeometry = new THREE.BufferGeometry();
        edgeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x1, y1, z1, x2, y2, z2]), 3));
        const edgeMaterial = new THREE.LineBasicMaterial({ color: edgeColors[length] });
        const edgeLine = new THREE.Line(edgeGeometry, edgeMaterial);
        scene.add(edgeLine);
      }

      // Ordenar lados para agrupar triângulos iguais
      triangleEdges.sort((a, b) => a - b);
      const key = triangleEdges.join('-');

      if (!triangleGroups[key]) {
        triangleGroups[key] = { count: 0, area: 0, edges: triangleEdges, vertices: [] };
      }

      // Calcular a área do triângulo
      const [a, b, c] = triangleEdges.map(Number);
      const s = (a + b + c) / 2; // Semiperímetro
      const area = Math.sqrt(s * (s - a) * (s - b) * (s - c)).toFixed(3);

      triangleGroups[key].count++;
      triangleGroups[key].area = parseFloat(area);
      triangleGroups[key].vertices.push(triangleVertices);
    }
  }

  geometry.setIndex(newIndices);
  geometry.computeVertexNormals();

  // Adicionar triângulos agrupados no desenho
  Object.entries(triangleGroups).forEach(([key, group]) => {
    const color = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Gerar cor aleatória
    group.color = color;

    group.vertices.forEach(triangle => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(triangle.flat());

      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);

      scene.add(mesh);
    });
  });

  camera.position.z = radius * 3;

  const animate = () => {
    if (isAnimating) {
      scene.rotation.y += rotationSpeed; // Rotação automática
    }
    scene.rotation.x = rotation.x;
    scene.rotation.y += rotation.y;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  animate();

  // Exibir os resultados
  const infoDiv = document.getElementById('geodesic-info');
 infoDiv.innerHTML = `
  <h2>Resultados da Geodésica (${geodesicType})</h2>
  <h3>Grupos de Triângulos Iguais:</h3>
  <ul>
    ${Object.entries(triangleGroups).map(([key, group]) => `
      <li style="color:${group.color}">
        ${group.count} triângulos com área de ${group.area.toFixed(3)} m² (Lados: ${group.edges.join(', ')} m)
      </li>
    `).join('')}
  </ul>
  <h3>Contagem de Lados Iguais:</h3>
  <ul>
    ${Object.entries(edgeCounts).map(([length, count]) => `
      <li style="color:${edgeColors[length]}">${count} lados com comprimento de ${length} m</li>
    `).join('')}
  </ul>
  <button id="zoomIn">Zoom In</button>
  <button id="zoomOut">Zoom Out</button>
  <button id="toggleAnimation">Iniciar Animação</button>
  <button id="rotateLeft">Girar Esquerda</button>
  <button id="rotateRight">Girar Direita</button>
  <button id="rotateUp">Girar Para Cima</button>
  <button id="rotateDown">Girar Para Baixo</button>
  <button id="show2D">Mostrar Apenas Triângulos Iguais em 2D</button>
`;


  // Configurar botões de controle
  document.getElementById('zoomIn').addEventListener('click', controls.zoomIn);
  document.getElementById('zoomOut').addEventListener('click', controls.zoomOut);
  document.getElementById('toggleAnimation').addEventListener('click', controls.toggleAnimation);
  document.getElementById('rotateLeft').addEventListener('click', controls.rotateLeft);
  document.getElementById('rotateRight').addEventListener('click', controls.rotateRight);
  document.getElementById('rotateUp').addEventListener('click', controls.rotateUp);
  document.getElementById('rotateDown').addEventListener('click', controls.rotateDown);
  
  



document.getElementById('show2D').addEventListener('click', () => {
  // Limpar a cena
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  // Configurações básicas
  const scaleFactor = 100; // Escalar os valores para uma escala visível
  const spacingX = 300; // Espaçamento horizontal entre os triângulos
  let xOffset = 0; // Deslocamento inicial no eixo X
  const yOffset = 0; // Deslocamento inicial no eixo Y

  // Verificar se há triângulos a serem renderizados
  if (!Object.keys(triangleGroups).length) {
    alert('Nenhum triângulo foi gerado. Por favor, gere a geodésica primeiro.');
    return;
  }

  // Iterar sobre cada grupo de triângulos iguais
  Object.entries(triangleGroups).forEach(([key, group]) => {
    const edges = group.edges.map(parseFloat); // Comprimentos das arestas
    const [a, b, c] = edges; // Lados do triângulo

    // Calcular a altura do triângulo
    const height = Math.sqrt(c ** 2 - ((a ** 2 + b ** 2 - c ** 2) / (2 * a)) ** 2);

    // Escalar os lados para torná-los visíveis
    const scaledA = a * scaleFactor;
    const scaledB = b * scaleFactor;
    const scaledC = c * scaleFactor;
    const scaledHeight = height * scaleFactor;

    // Definir os vértices no plano 2D
    const v1 = [xOffset, yOffset, 0];
    const v2 = [xOffset + scaledA, yOffset, 0];
    const v3 = [
      xOffset + (scaledB ** 2 - scaledHeight ** 2) / (2 * scaledA), // Projeção no eixo X
      yOffset + scaledHeight, // Projeção no eixo Y
      0,
    ];

    console.log('Vértices normalizados e escalados:', v1, v2, v3);

    // Calcular os ângulos do triângulo
    const angleA = Math.acos((b ** 2 + c ** 2 - a ** 2) / (2 * b * c)) * (180 / Math.PI);
    const angleB = Math.acos((a ** 2 + c ** 2 - b ** 2) / (2 * a * c)) * (180 / Math.PI);
    const angleC = 180 - angleA - angleB;

    // Criar a geometria do triângulo
    const triangleGeometry = new THREE.BufferGeometry();
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      ...v1, ...v2, ...v3
    ]), 3));
    triangleGeometry.setIndex([0, 1, 2]); // Definir os índices do triângulo

    // Criar o material para o triângulo
    const triangleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Vermelho para fácil visualização
      side: THREE.DoubleSide,
    });

    // Criar o Mesh para o triângulo
    const triangleMesh = new THREE.Mesh(triangleGeometry, triangleMaterial);
    scene.add(triangleMesh);

    // Adicionar medidas dos lados
    const textPositions = [
      [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2], // Meio do lado A
      [(v2[0] + v3[0]) / 2, (v2[1] + v3[1]) / 2], // Meio do lado B
      [(v3[0] + v1[0]) / 2, (v3[1] + v1[1]) / 2], // Meio do lado C
    ];

    const sideTexts = [`${a.toFixed(2)} m`, `${b.toFixed(2)} m`, `${c.toFixed(2)} m`];
    textPositions.forEach((pos, i) => {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.color = 'blue';
      div.style.transform = `translate(-50%, -50%)`;
      div.style.left = `${pos[0]}px`;
      div.style.top = `${-pos[1]}px`;
      div.innerText = sideTexts[i];
      document.body.appendChild(div);
    });

    // Adicionar ângulos
    const anglePositions = [v1, v2, v3];
    const angleTexts = [`${angleA.toFixed(2)}°`, `${angleB.toFixed(2)}°`, `${angleC.toFixed(2)}°`];
    anglePositions.forEach((pos, i) => {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.color = 'green';
      div.style.transform = `translate(-50%, -50%)`;
      div.style.left = `${pos[0]}px`;
      div.style.top = `${-pos[1]}px`;
      div.innerText = angleTexts[i];
      document.body.appendChild(div);
    });

    console.log('Triângulo dinâmico adicionado à cena:', triangleMesh);

    // Atualizar o deslocamento no eixo X para o próximo triângulo
    xOffset += spacingX + scaledA;
  });

  // Ajustar a posição e orientação da câmera
  const midX = xOffset / 2; // Centralizar a câmera horizontalmente
  camera.position.set(midX, yOffset + 100, 1000); // Ajustar a distância
  camera.lookAt(midX, yOffset, 0);
  camera.updateProjectionMatrix();

  // Renderizar a cena novamente
  renderer.render(scene, camera);
});



















};


document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('generate').addEventListener('click', generateGeodesic);
});



// Função para exportar DXF
const exportToDXF = () => {
  if (!Object.keys(triangleGroups).length) {
    alert('Gere a geodésica primeiro!');
    return;
  }

  let dxfContent = "0\nSECTION\n2\nENTITIES\n";

  Object.entries(triangleGroups).forEach(([key, group]) => {
    group.vertices.forEach(triangle => {
      for (let i = 0; i < triangle.length; i++) {
        const start = triangle[i];
        const end = triangle[(i + 1) % triangle.length];
        dxfContent += `
0
LINE
8
0
10
${start[0]}
20
${start[1]}
30
${start[2]}
11
${end[0]}
21
${end[1]}
31
${end[2]}
`;
      }
    });
  });

  dxfContent += "0\nENDSEC\n0\nEOF";

  const blob = new Blob([dxfContent], { type: "application/dxf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "geodesic.dxf";
  link.click();
};

// Função para exportar STL
const exportToSTL = () => {
  if (!Object.keys(triangleGroups).length) {
    alert('Gere a geodésica primeiro!');
    return;
  }

  let stlContent = "solid geodesic\n";

  Object.entries(triangleGroups).forEach(([key, group]) => {
    group.vertices.forEach(triangle => {
      const [v1, v2, v3] = triangle;

      // Calculando a normal do triângulo
      const normal = new THREE.Vector3()
        .crossVectors(
          new THREE.Vector3().subVectors(new THREE.Vector3(...v2), new THREE.Vector3(...v1)),
          new THREE.Vector3().subVectors(new THREE.Vector3(...v3), new THREE.Vector3(...v1))
        )
        .normalize();

      stlContent += `
facet normal ${normal.x} ${normal.y} ${normal.z}
  outer loop
    vertex ${v1[0]} ${v1[1]} ${v1[2]}
    vertex ${v2[0]} ${v2[1]} ${v2[2]}
    vertex ${v3[0]} ${v3[1]} ${v3[2]}
  endloop
endfacet
`;
    });
  });

  stlContent += "endsolid geodesic";

  const blob = new Blob([stlContent], { type: "application/vnd.ms-pki.stl" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "geodesic.stl";
  link.click();
};





const exportToSTLByGroup2D = () => {
  if (!Object.keys(triangleGroups).length) {
    alert('Gere a geodésica primeiro!');
    return;
  }

  let stlContent = '';

  // Configurações para escala e espaçamento, usadas no show2D
  const scaleFactor = 100; // Mesma escala do show2D
  const spacingX = 300; // Espaçamento horizontal entre triângulos
  let xOffset = 0; // Deslocamento inicial no eixo X

  Object.entries(triangleGroups).forEach(([key, group]) => {
    stlContent += `solid geodesic_group_${key.replace(/\./g, '_')}
`;

    // Processar apenas o primeiro triângulo do grupo
    if (group.vertices.length > 0) {
      const edges = group.edges.map(parseFloat); // Lados do triângulo
      const [a, b, c] = edges;

      // Calcular a altura do triângulo
      const height = Math.sqrt(c ** 2 - ((a ** 2 + b ** 2 - c ** 2) / (2 * a)) ** 2);

      // Escalar os lados para ajustar ao mesmo plano do show2D
      const scaledA = a * scaleFactor;
      const scaledB = b * scaleFactor;
      const scaledHeight = height * scaleFactor;

      // Definir os vértices no plano 2D
      const v1 = [xOffset, 0, 0];
      const v2 = [xOffset + scaledA, 0, 0];
      const v3 = [
        xOffset + (scaledB ** 2 - scaledHeight ** 2) / (2 * scaledA), // Projeção no eixo X
        scaledHeight, // Projeção no eixo Y
        0,
      ];

      // Adicionar medidas como comentários
      stlContent += `  // Lados: A=${a.toFixed(3)} m, B=${b.toFixed(3)} m, C=${c.toFixed(3)} m\n`;

      // Adicionar triângulo ao STL
      stlContent += `
facet normal 0 0 1
  outer loop
    vertex ${v1[0]} ${v1[1]} ${v1[2]}
    vertex ${v2[0]} ${v2[1]} ${v2[2]}
    vertex ${v3[0]} ${v3[1]} ${v3[2]}
  endloop
endfacet
`;

      // Adicionar as medidas ao longo dos lados (como comentários STL)
      stlContent += `
  // Medidas (Escala ${scaleFactor}):
  // Lado A: de (${v1[0]}, ${v1[1]}) para (${v2[0]}, ${v2[1]}) - ${a.toFixed(3)} m
  // Lado B: de (${v2[0]}, ${v2[1]}) para (${v3[0]}, ${v3[1]}) - ${b.toFixed(3)} m
  // Lado C: de (${v3[0]}, ${v3[1]}) para (${v1[0]}, ${v1[1]}) - ${c.toFixed(3)} m
`;

      // Atualizar deslocamento X para o próximo triângulo
      xOffset += spacingX + scaledA;

      stlContent += `endsolid geodesic_group_${key.replace(/\./g, '_')}\n`;
    }
  });

  // Criar e baixar o arquivo STL
  const blob = new Blob([stlContent], { type: "application/vnd.ms-pki.stl" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `geodesic_groups_2D_with_dimensions.stl`;
  link.click();
};

// Adicionar evento ao botão correspondente
document.getElementById('exportGroupSTL2D').addEventListener('click', exportToSTLByGroup2D);




const exportToSVGlegenda = () => {
  if (!Object.keys(triangleGroups).length) {
    alert('Gere a geodésica primeiro!');
    return;
  }

  // Configurações básicas para o arquivo SVG
  const scaleFactor = 100; // Mesma escala do show2D
  const spacingX = 300; // Espaçamento horizontal entre triângulos
  const svgWidth = 3000; // Largura total do SVG
  const svgHeight = 1000; // Altura total do SVG
  let totalWidth = 0; // Para calcular a largura total ocupada pelos triângulos
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">\n`;

  // Primeiro, calcular a largura total ocupada pelos triângulos
  Object.entries(triangleGroups).forEach(([key, group]) => {
    if (group.vertices.length > 0) {
      const edges = group.edges.map(parseFloat); // Comprimentos dos lados
      const [a] = edges; // Apenas o lado "A" contribui diretamente para o espaçamento horizontal
      const scaledA = a * scaleFactor;
      totalWidth += scaledA + spacingX; // Soma do lado escalado e do espaçamento
    }
  });
  totalWidth -= spacingX; // Remover o último espaçamento extra

  // Calcular deslocamentos iniciais para centralizar
  const xOffsetStart = (svgWidth - totalWidth) / 2;
  const yOffsetStart = svgHeight / 2;

  let xOffset = xOffsetStart; // Começar com o deslocamento inicial

  // Gerar o conteúdo SVG
  Object.entries(triangleGroups).forEach(([key, group]) => {
    if (group.vertices.length > 0) {
      const edges = group.edges.map(parseFloat); // Comprimentos dos lados
      const [a, b, c] = edges;

      // Calcular a altura do triângulo
      const height = Math.sqrt(c ** 2 - ((a ** 2 + b ** 2 - c ** 2) / (2 * a)) ** 2);

      // Calcular os ângulos do triângulo
      const angleA = Math.acos((b ** 2 + c ** 2 - a ** 2) / (2 * b * c)) * (180 / Math.PI);
      const angleB = Math.acos((a ** 2 + c ** 2 - b ** 2) / (2 * a * c)) * (180 / Math.PI);
      const angleC = 180 - angleA - angleB;

      // Escalar os lados
      const scaledA = a * scaleFactor;
      const scaledB = b * scaleFactor;
      const scaledHeight = height * scaleFactor;

      // Definir os vértices no plano 2D
      const v1 = [xOffset, yOffsetStart];
      const v2 = [xOffset + scaledA, yOffsetStart];
      const v3 = [
        xOffset + (scaledB ** 2 - scaledHeight ** 2) / (2 * scaledA), // Projeção no eixo X
        yOffsetStart - scaledHeight, // Projeção no eixo Y invertida para SVG
      ];

      // Adicionar o triângulo ao SVG
      svgContent += `  <polygon points="${v1[0]},${v1[1]} ${v2[0]},${v2[1]} ${v3[0]},${v3[1]}" fill="none" stroke="black" stroke-width="1" />\n`;

      // Adicionar as medidas dos lados
      const textPositions = [
        [(v1[0] + v2[0]) / 2, (v1[1] + v2[1]) / 2], // Meio do lado A
        [(v2[0] + v3[0]) / 2, (v2[1] + v3[1]) / 2], // Meio do lado B
        [(v3[0] + v1[0]) / 2, (v3[1] + v1[1]) / 2], // Meio do lado C
      ];

      const sideTexts = [`${a.toFixed(2)} m`, `${b.toFixed(2)} m`, `${c.toFixed(2)} m`];
      textPositions.forEach((pos, i) => {
        svgContent += `  <text x="${pos[0]}" y="${pos[1]}" fill="blue" font-size="12" text-anchor="middle">${sideTexts[i]}</text>\n`;
      });

      // Adicionar os ângulos nos vértices
      const anglePositions = [v1, v2, v3];
      const angleTexts = [`${angleA.toFixed(2)}°`, `${angleB.toFixed(2)}°`, `${angleC.toFixed(2)}°`];
      anglePositions.forEach((pos, i) => {
        svgContent += `  <text x="${pos[0]}" y="${pos[1] - 10}" fill="green" font-size="12" text-anchor="middle">${angleTexts[i]}</text>\n`;
      });

      // Atualizar deslocamento X para o próximo triângulo
      xOffset += scaledA + spacingX;
    }
  });

  svgContent += '</svg>';

  // Criar e baixar o arquivo SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'triangles_with_dimensions_centered-legenda.svg';
  link.click();
};

// Adicionar evento ao botão correspondente
document.getElementById('exportToSVGlegenda').addEventListener('click', exportToSVGlegenda);











const exportToSVG = () => {
  if (!Object.keys(triangleGroups).length) {
    alert('Gere a geodésica primeiro!');
    return;
  }

  // Configurações básicas para o arquivo SVG
  const scaleFactor = 100; // Mesma escala do show2D
  const spacingX = 300; // Espaçamento horizontal entre triângulos
  const svgWidth = 2000; // Largura total do SVG
  const svgHeight = 1000; // Altura total do SVG
  let totalWidth = 0; // Para calcular a largura total ocupada pelos triângulos

  // Primeiro, calcular a largura total ocupada pelos triângulos
  Object.entries(triangleGroups).forEach(([key, group]) => {
    if (group.vertices.length > 0) {
      const edges = group.edges.map(parseFloat); // Comprimentos dos lados
      const [a] = edges; // Apenas o lado "A" contribui diretamente para o espaçamento horizontal
      const scaledA = a * scaleFactor;
      totalWidth += scaledA + spacingX; // Soma do lado escalado e do espaçamento
    }
  });
  totalWidth -= spacingX; // Remover o último espaçamento extra

  // Calcular deslocamentos iniciais para centralizar
  const xOffsetStart = (svgWidth - totalWidth) / 2;
  const yOffsetStart = svgHeight / 2;

  let xOffset = xOffsetStart; // Começar com o deslocamento inicial
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">\n`;

  // Adicionar um layer
  svgContent += `<g inkscape:groupmode="layer" id="layer1" inkscape:label="Corte">\n`;

  // Gerar o conteúdo SVG
  Object.entries(triangleGroups).forEach(([key, group]) => {
    if (group.vertices.length > 0) {
      const edges = group.edges.map(parseFloat); // Comprimentos dos lados
      const [a, b, c] = edges;

      // Calcular a altura do triângulo
      const height = Math.sqrt(c ** 2 - ((a ** 2 + b ** 2 - c ** 2) / (2 * a)) ** 2);

      // Escalar os lados
      const scaledA = a * scaleFactor;
      const scaledB = b * scaleFactor;
      const scaledHeight = height * scaleFactor;

      // Definir os vértices no plano 2D
      const v1 = [xOffset, yOffsetStart];
      const v2 = [xOffset + scaledA, yOffsetStart];
      const v3 = [
        xOffset + (scaledB ** 2 - scaledHeight ** 2) / (2 * scaledA), // Projeção no eixo X
        yOffsetStart - scaledHeight, // Projeção no eixo Y invertida para SVG
      ];

      // Adicionar linhas do triângulo como caminhos vetoriais
      svgContent += `
        <path d="M ${v1[0]} ${v1[1]} L ${v2[0]} ${v2[1]} L ${v3[0]} ${v3[1]} Z" 
              fill="none" stroke="black" stroke-width="1" />\n`;

      // Atualizar deslocamento X para o próximo triângulo
      xOffset += spacingX + scaledA;
    }
  });

  // Fechar o grupo do layer
  svgContent += `</g>\n`;

  svgContent += '</svg>';

  // Criar e baixar o arquivo SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'triangles_2D_centered_with_layer.svg';
  link.click();
};

// Adicionar evento ao botão correspondente
document.getElementById('exportToSVG').addEventListener('click', exportToSVG);

// Vincular os botões às funções
document.getElementById('exportDXF').addEventListener('click', exportToDXF);
document.getElementById('exportSTL').addEventListener('click', exportToSTL);
