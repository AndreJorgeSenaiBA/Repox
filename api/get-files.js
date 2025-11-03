// api/get-files.js - API atualizada para Repox

export default async function handler(req, res) {
  // Configurações
  const GITHUB_USER = "AndreJorgeSenaiBA";
  const GITHUB_REPO = "dados";
  const GITHUB_PATH = "";  // Raiz do repositório

  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    return res.status(500).json({ 
      error: 'Token do GitHub não configurado. Configure GITHUB_TOKEN nas variáveis de ambiente.' 
    });
  }

  // Extensões permitidas
  const videoExt = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const imageExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const allowedExt = [...videoExt, ...imageExt];

  try {
    console.log('🔍 Buscando estrutura do repositório...');
    
    // Função recursiva para buscar todos os arquivos
    async function fetchAllFiles(path = '') {
      const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Repox-App'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro do GitHub:', response.status, errorText);
        throw new Error(`Erro do GitHub (${response.status}): ${response.statusText}`);
      }

      const items = await response.json();
      
      if (!Array.isArray(items)) {
        throw new Error('Resposta inesperada da API do GitHub');
      }

      let allFiles = [];

      // Processar cada item
      for (const item of items) {
        if (item.type === 'file') {
          // É um arquivo - verificar se é mídia válida
          const ext = item.name.split('.').pop().toLowerCase();
          if (allowedExt.includes(ext)) {
            allFiles.push(item);
          }
        } else if (item.type === 'dir') {
          // É uma pasta - buscar recursivamente
          console.log(`📁 Explorando pasta: ${item.path}`);
          const subFiles = await fetchAllFiles(item.path);
          allFiles = allFiles.concat(subFiles);
        }
      }

      return allFiles;
    }

    // Buscar todos os arquivos
    const files = await fetchAllFiles(GITHUB_PATH);
    
    console.log(`Total de arquivos encontrados: ${files.length}`);

    // Processar arquivos e organizar por perfil
    const mediaFiles = files.map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const type = videoExt.includes(ext) ? 'video' : 'image';
      
      // Extrair perfil do caminho
      // Se o arquivo está em pasta/arquivo.jpg -> perfil = "pasta"
      // Se o arquivo está na raiz arquivo.jpg -> perfil = "unknown"
      const pathParts = file.path.split('/');
      let profileName = 'unknown';
      
      if (pathParts.length > 1) {
        // Arquivo está dentro de uma pasta
        profileName = pathParts[0];
      }
      
      return {
        id: file.sha,
        type: type,
        url: file.download_url,
        title: file.name.split('.')[0], // Nome sem extensão
        name: file.name, // Nome completo (para uso interno)
        path: file.path,
        profile: profileName,
        date: new Date().toISOString().split('T')[0],
        size: file.size
      };
    });

    console.log(`Arquivos de mídia válidos: ${mediaFiles.length}`);
    
    // Organizar estatísticas por perfil
    const profileStats = {};
    mediaFiles.forEach(file => {
      if (!profileStats[file.profile]) {
        profileStats[file.profile] = {
          name: file.profile,
          fileCount: 0
        };
      }
      profileStats[file.profile].fileCount++;
    });
    
    console.log('📊 Perfis encontrados:', Object.keys(profileStats).length);
    Object.keys(profileStats).forEach(profile => {
      console.log(`  - ${profile}: ${profileStats[profile].fileCount} arquivos`);
    });

    // Cache por 10 minutos
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(200).json(mediaFiles);
    
  } catch (error) {
    console.error('❌ Erro ao buscar arquivos:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Verifique se o token do GitHub está correto e tem permissões de leitura no repositório'
    });
  }

}

