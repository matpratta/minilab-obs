// Biblioteca easymidi
const midi = require('easymidi')

// Biblioteca OBSD
const obsWS = require('obs-websocket-js')

// Obter lista de inputs MIDI
const midiInputs = midi.getInputs()

// Selecionar nossa controladora
let minilabInput = midiInputs.filter(input => ~input.indexOf('Arturia MiniLab mkII')).shift()

// A controladora foi encontrada?
if (!minilabInput) {
  // Não, então retornamos erro
  console.error('Nenhuma controladora compatível encontrada.')
} else {
  // Sim, então conectamos à controladora
  const minilab = new midi.Input(minilabInput)
  const minilabOut = new midi.Output(minilabInput)

  // Biblioteca de render
  const render = require('./leds').init(minilabOut)

  // Interface
  const ui = {
    currentSceneIndex: 0
  }
  
  // Lista de cenas
  let cenas = []

  // Conectamos ao OBS
  const obs = new obsWS()
  obs.connect({ address: '127.0.0.1:4444' })
  .then(() => {
    // Estamos conectados ao OBS aqui
    // Obter lista de cenas
    return obs.send('GetSceneList')
  })
  .then(data => {
    // Criamos a lista de cenas
    cenas = data.scenes.map(scene => scene.name)

    minilab.on('sysex', console.info)

    minilab.on('noteon', msg => {
      // Tipo de evento
      let evento = {
        tipo: 'geral'
      }

      // Categoriza tipo de evento para pads
      if (msg.note >= 36 && msg.note <= 43) {
        evento.tipo = 'pads'
        evento.tecla = msg.note - 36
      }

      // Se for pad
      if (evento.tipo == 'pads') {
        let cenaNome = cenas[evento.tecla]
        if (cenaNome) {
          obs.send('SetCurrentScene', { 'scene-name': cenaNome })
        }
      }
    })
  })

  // Quando mudar de cena
  obs.on('SwitchScenes', data => {
    // Buscamos o index da cena
    let cenaId = cenas.indexOf(data.sceneName)

    // Trocamos a cena atual
    ui.currentSceneIndex = cenaId
  })

  // Atualiza interface
  setInterval(() => {
    // Limpamos a exibição
    render.clear()

    // Exibimos a cena atual
    render.color(ui.currentSceneIndex, 'magenta')
  }, 500)
}