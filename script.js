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
        statusConfig.textContent = '0 endpoint deve terminar com /openai/v1/responses.';

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
    if (!config.endpoint || !config.deployment || config.apiKey) {
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
historico.push({
    role: 'user',
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
    const resposta = await perguntaParaAzure();

    //Substituir "Pensando..." pela resposta
    carregando.textContent = resposta;
    

    //So adiciona ao historico se recebemos uma resposta valida
    if(resposta && !resposta.startsWith('Ocorreu um erro')){

        historico.push({
            role: 'assistant',
            content: resposta
    });   
    }

}catch(erro){
    console.error('Erro no chat', erro);
    carregando.textContent = 'Nao foi possivel obter uma resposta da Azure.';
    }
    }); 