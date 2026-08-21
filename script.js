//Elementos da interface
//Ela cria as variaveis pra usar

//tem que estar exatamente igual o do HTML - VERIFICAR CASO DER ERRO

const inputEndpoint = document.getElementById('endpoint');
const inputDeployment = document.getElementById('deployment');
const inputApiKey = document.getElementById('apiKey');

const btnSalvar = document.getElementById('btnSalvar');
const statusConfig = document.getElementById('statusConfig');

const formChat = document.getElementById('formChat');
const campoMensagem = document.getElementById('campoMensagem');
const listaMensagens = document.getElementById('mensagens');

//Configuracao da API

let config = {
    endpoint: '',
    deployment: '',
    apiKey: ''
};

//Instrucoes do CineIA

const instrucoesCineIA = 'Voce e o CineIA, um assistente especializado em recomendar' +
    'filmes e series. Seja breve simpatico e objetivo' +
    'Sempre sugira pelo menos um titulo concreto' +
    'Explique em uma frase por que a recomendacao combina com o pedido' +
    'Considere genero, clima, estilo e refencias mencionadas pelo usuario';

//Historico de conversa

//Cria uma lista vazia
//O comando let tambem cria a variavel, porem avisa para o Java que ela pode mudar com o tempo
//ela eh diferente do "const" que nao se muda com o tempo
let historico = [];

//Passo 1 - Salvar Configuracao
//Ele salva o arquivo do azure para usar a IA aqui

btnSalvar.addEventListener('click', () => {

    //Remove espacos desnecessarios
    config.endpoint = inputEndpoint.value.trim();
    config.deployment = inputDeployment.value.trim();
    config.apiKey = inputApiKey.value.trim();

    //Verificar se os tres campos foram preenchidos
    if (!config.endpoint || !config.deployment || !config.apiKey) {
        statusConfig.textContent = 'Preencha o Endpoint, o Deploymento e o API Key';
        return;
    }

    //Verifica se o Endpoint possui o formato esperado
    if (!config.endpoint.includes('/openai/v1/responses')) {
        statusConfig.textContent = 'O endpoint deve terminar com /openai/v1/responses.';

        return;
    }

    statusConfig.textContent = 'Configuracao salva ✅';
});

//Passo 2 - Enviar mensagem

formChat.addEventListener('submit', async (evento) => {

    //Impede que a pagina seja recarregada
    evento.preventDefault();

    //Pega o texto digitado pelo usuario
    const texto = campoMensagem.value.trim();

    //Nao envia mensagens vazias
    if (!texto) {
        return
    }

    //Verifica se a configuracao foi realizada
    if (!config.endpoint || !config.deployment || !config.apiKey) {
        adicionarMensagemNaTela(
            'bot',
            'Configure o Endpoint, o Deployment e a API Key antes de conversar.'
        );
        return;
    }

    //Mostrar a mensagem do usuario na tela
    adicionarMensagemNaTela('user', texto);

    //Limpar o campo texto
    campoMensagem.value = '';

    //Adicionar a mensagem ao historico

    //Adiciona um novo item ao final de uma lista (array) chamada historico.  
    // Essa lista é fundamental para a IA, pois envia o contexto das 
    // mensagens passadas a cada nova pergunta.
    historico.push({ 
        
    //Define a propriedade role (papel) do objeto como 'user'. Isso informa à API do OpenAI 
    // que esta mensagem específica foi enviada pela pessoa, e não pelo sistema ou pela IA.
        role: 'user', 
        
        //Define a propriedade content (conteúdo) do objeto com o valor exato da frase que você 
        // //acabou de digitar no chat.
        content: texto
    });

    //Mostrar mensagem temporaria enquanto aguarda a Azure
    const carregando = adicionarMensagemNaTela(
        'bot',
        'Pensando...'
    );

    // Desabilita o botão enquanto aguarda a resposta
    const botaoEnviar = formChat.querySelector('button[type="submit"]');

    if (botaoEnviar) {
        botaoEnviar.disabled = true;
    }

    try {

        //Chama a Azure OpenAI
        //O uso do await faz o código "pausar" a execução desta linha até que os servidores da Azure respondam. 
        // Quando a resposta do assistente chega, seu texto é armazenado na constante resposta.
        const resposta = await perguntaParaAzure();



        //Substituir "Pensando..." pela resposta da IA
        carregando.textContent = resposta;


        //So adiciona ao historico se recebemos uma resposta valida  
        // a linha if quer dizer: Se tiver uma resposta, e essa resposta não comecar com "Ocorreu um erro", 
        // ele adicionar ao historico da conversa, para usar na proxima mensagem
         if (resposta && !resposta.startsWith('Ocorreu um erro')) {


            historico.push({
                role: 'assistant',
                content: resposta
            });
        }


    } catch (erro) {
        console.error('Erro no chat', erro);
        carregando.textContent = 'Nao foi possivel obter uma resposta da Azure.';
    } finally {
        //Reativa o botao
        if (botaoEnviar) {
            botaoEnviar.disabled = false;
        }

        //Devolve o foco para o campo mensagem
        campoMensagem.focus();
    }
});

//Funcao Principal - Azure OpenAI responses API
async function perguntaParaAzure() {
    //Verifica a configuracao
    if (!config.endpoint || !config.deployment || !config.apiKey) {
        return (
            'Configure o Endpoint, o Deployment e a API Key antes de conversar.'
        );
    }

    //Endpoint
    const url = config.endpoint.replace(/\/+$/, '');

    //Corpo da Requisicao

    const Corpo = {
        model: config.deployment,
        instructions: instrucoesCineIA,
        input: historico
    };

try {
// Faz a requisicao para a Azure
const resposta = await fetch(url, {

    method: 'Post',
    headers: {
        'Content-Type': 'application/json',

        //Chave de acesso da Azure
        'api-key': config.apiKey
    },
    body: JSON.stringify(Corpo)
});

//Tratamento de erro
if (!resposta.ok) {
    const erroTexto = await resposta.text();
    console.error('Erro da Azure: ', erroTexto);

    //Tenta transformar o erro em Json
    let mensagemErro = erroTexto;

    try {
        const erroJson = JSON.parse(erroTexto);
        if (erroTexto.error?.message) {
            mensagemErro = erroJson.error.message;
        }
    } catch {

        //Caso o retorno não seja JSON
        //Mantém o texto original.
    }
    return (
        `Ocorreu um erro(${resposta.status}): ${mensagemErro}`
    );
}

//Converte a resposta para JSON
const dados = await resposta.json();

console.log('Resposta completa da Azure:', dados);

//Extrai o texto gerado
if (dados.output_text) {
    return dados.output_text;
}
//Fallback
//Caso o output_text não esteja disponivel, tentamos localizar
// o texto dentro da estrutura do output.

if (Array.isArray(dados.output)) {
    for (const item of dados.output) {
        if (Array.isArray(item.content)) {
            for (const conteudo of item.content) {
                if (conteudo.text) {
                    return conteudo.text;
                }
            }
        }
    }
}

console.error(
    'Não foi possivel localizar o texto da resposta:',   
dados
);
return 'A Azure respondeu, mas não foi possível encontrar o texto da resposta.';
}catch(erro){
    //Erro de conexao
    console.error('Erro de conexao com a Azure');
    return(
        'Nao foi possivel conectar a Azure.' +
        'Verifique o endpoint, a API Key, o CORS e a sua conexao.'
    );
}
}

// Funcao Auxiliar - Adicionar mensagem na tela
function adicionarMensagemNaTela(remetente, texto) {
    const div = document.createElement('div');

    // Define a classe CSS da mensagem
    div.classList.add(
        'msg',
        remetente === 'user' ? 'user' : 'bot'
    );

    // Insere o texto
    div.textContent = texto;

    // Adiciona a mensagem ao chat
    listaMensagens.appendChild(div);

    // Rola automaticamente para a ultima mensagem
    listaMensagens.scrollTop = listaMensagens.scrollHeight;

    return div;
}


