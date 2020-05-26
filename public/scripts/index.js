let isAlreadyCalling = false; // define por default a chamada com false
let getCalled = false; // define por default a resposta da chamada como false

const existingCalls = [];

const { RTCPeerConnection, RTCSessionDescription } = window;

const peerConnection = new RTCPeerConnection();

// desmarcar Usuários da lista
function unselectUsersFromList() {
  // seleciona todos elementos com '.active-user'
  const alreadySelectedUser = document.querySelectorAll(
    '.active-user.active-user--selected'
  );

  alreadySelectedUser.forEach((el) => {
    el.setAttribute('class', 'active-user');
  });
}

// função que cria elemetos para renderizar os soquetes
function createUserItemContainer(socketId) {
  const userContainerEl = document.createElement('div'); // cria uma div para esse socket

  const usernameEl = document.createElement('p'); // cria um campo de texto

  userContainerEl.setAttribute('class', 'active-user'); // seta uma class para a div
  userContainerEl.setAttribute('id', socketId); // seta um id único para a div
  usernameEl.setAttribute('class', 'username'); // seta uma class para a tag 'p'
  usernameEl.innerHTML = `Socket: ${socketId}`; // insere um texto , informando o id do soquete

  userContainerEl.appendChild(usernameEl); // adiciona a tag 'p' para a div

  // adicionando ouvinte de 'click' ao container
  userContainerEl.addEventListener('click', () => {
    unselectUsersFromList();
    userContainerEl.setAttribute('class', 'active-user active-user--selected'); // insere uma class ao container
    const talkingWithInfo = document.getElementById('talking-with-info');
    talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`; // renderiza o soquete que foi sintonizado
    callUser(socketId); // depois de clicar no usuário ativo, chamar a função callUser
  });

  return userContainerEl; // retorna o container com o novo soquete conectado
}

// função assincrona que abre uma chamada ao usuario
async function callUser(socketId) {
  const offer = await peerConnection.createOffer(); // variavel que propõe uma chamada
  await peerConnection.setLocalDescription(new RTCSessionDescription(offer)); // cria uma nova sessão RTC para a chamada

  // emiti uma mensagem de call entre os soquetes
  socket.emit('call-user', {
    offer, // o usuario que propoe a chamada
    to: socketId, // para quem será redirecionada
  });
}

// função que recebe o array de soquetes conectados
function updateUserList(socketIds) {
  const activeUserContainer = document.getElementById('active-user-container');

  // para cada soquete ID desse array
  socketIds.forEach((socketId) => {
    const alreadyExistingUser = document.getElementById(socketId);
    // se não existir o soquete na lista
    if (!alreadyExistingUser) {
      const userContainerEl = createUserItemContainer(socketId); // passar para a função que renderiza os soquetes

      activeUserContainer.appendChild(userContainerEl); // e adicionar o novo soquete ao container de usuarios ativos
    }
  });
}
// implementando o comportamento do socket
const socket = io();

// respondendo a mensagem de 'update-user-list'
socket.on('update-user-list', ({ users }) => {
  updateUserList(users); // recebe os soquetes conectados
});

// respondendo a mensagem de 'remove-user'
socket.on('remove-user', ({ socketId }) => {
  const elToRemove = document.getElementById(socketId); // busca o id do soquete na lista de users

  if (elToRemove) {
    elToRemove.remove(); // se existir, então remover o elemento da lista
  }
});

// função que controla a chamada feita
socket.on('call-made', async (data) => {
  // se existir uma chamada, exibir um prompt perguntando se aceita uma chamada daquele usuário
  if (getCalled) {
    const confirmed = confirm(
      `User "Socket: ${data.socket}" wants to call you. Do accept this call?`
    );
    // se não confirmar a chamada, emitir 'reject-call' ao usuário que solicitou
    if (!confirmed) {
      socket.emit('reject-call', {
        from: data.socket,
      });

      return; // finaliza o if;
    }
  }
  // cria uma sessão única
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.offer)
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

  // emit uma resposta de sucesso
  socket.emit('make-answer', {
    answer,
    to: data.socket,
  });
  getCalled = true;
});

// ouvindo o evento de resposta
socket.on('answer-made', async (data) => {
  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(data.answer)
  );
  // se não ouver nenhuma chamada ativa
  if (!isAlreadyCalling) {
    callUser(data.socket); // executar a função de callUser, passando o usuário requerente
    isAlreadyCalling = true; // define a chamada com true
  }
});

// ouvindo evento de chamada rejeitada
socket.on('call-rejected', (data) => {
  alert(`User: "Socket: ${data.socket}" rejected your call.`); // exibi um alerta informado que o usuário rejeitou a chamada
  unselectUsersFromList(); // chama a função para desmarcar usuário
});

// adicionando evento de 'ontrack' para capturar aúdio e video
peerConnection.ontrack = function ({ streams: [stream] }) {
  const remoteVideo = document.getElementById('remote-video');
  // agora o elemento 'remote-video' recebe os streams de aúdio e video
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

// manipula o acesso a câmera e microfone
navigator.getUserMedia(
  { video: true, audio: true },
  (stream) => {
    const localVideo = document.getElementById('local-video');
    if (localVideo) {
      localVideo.srcObject = stream;
    }

    stream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, stream)); //adicionando áudio e vídeo à conexão entre usuários.
  },
  (error) => {
    console.warn(error.message);
  }
);
