// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

export type WordConfig = {
  word: string
  fat: boolean
  cursive: boolean
  underscore: boolean
}

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

function getAllTextNodes() {
  return figma.root.findAllWithCriteria({
    types: ['TEXT']
  })
}

/** Gets all indices of a substring withtin a string */
function getAllIndicesOf(str: string, searchStr: string): number[] {
  if (searchStr == "") return []

  let re = new RegExp("\\b" + searchStr + "\\b")

  let startIndex = 0
  const indices = []

  let match
  while ((match = re.exec(str)) != null) {
    indices.push(match.index + startIndex)
    str = str.substring(match.index + searchStr.length)
    startIndex += match.index + searchStr.length
  }

  return indices;
}


function getWordList(csvstr: string): WordConfig[] {
  let c = csvstr.split("\n").map(line =>
    line.split(",").map(s => s.trim())
  )

  // remove head
  c.splice(0, 1)
  // format:
  // Unterstrichen,Kursiv,Fett,Name
  let x = c.map(l => ({
    word: "" + l.pop(),
    fat: l.pop() == "j",
    cursive: l.pop() == "j",
    underscore: l.pop() == "j"
  }))

  console.log("CSV DATA:", x)

  return x
}

async function applyStyleToTextNode(textNode: TextNode, config: WordConfig) {
  for (let rangestart of getAllIndicesOf(textNode.characters, config.word)) {
    let rangeend = rangestart + config.word.length

    if (config.underscore)
      textNode.setRangeTextDecoration(rangestart, rangeend, 'UNDERLINE')
    if (config.fat || config.cursive) {
      // { family: 'Inter', style: 'Regular' }
      let font = textNode.getRangeFontName(rangestart, rangestart + 1)
      if (font === figma.mixed) {
        figma.notify("Plugin encountered an error: Found charakter with multiple styles. this shouldn't be happening. skipping.")
        continue
      }
      let style = config.fat ? "Bold" : "Italic"

      let newfont = { style, family: font.family }
      try {
        await figma.loadFontAsync(font)
        await figma.loadFontAsync(newfont)
        textNode.setRangeFontName(rangestart, rangeend, newfont)
      } catch (e) {
        console.log(e)
      }
    }

  }
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  // One way of distinguishing between different types of messages sent from
  // your HTML page is to use an object with a "type" property like this.
  if (msg.type === 'apply-words') {

    let nodes = getAllTextNodes()
    let words: WordConfig[] = getWordList(msg.csvStr)
    console.log(`found ${nodes.length} text nodes`)
    let progress = 0
    
    let logProgress = () => {
      let p = Math.floor((progress/nodes.length)*100)
      let s = `${p}%: ${progress} of ${nodes.length} done`
      console.log(s)
      figma.ui.postMessage({infoStr: s})
    }

    logProgress()

    for (let node of nodes) {
      for (let word in words) {
        await applyStyleToTextNode(node, words[word])
      }
      progress += 1
      
      if ((progress & 0b111) == 0) logProgress()
    }

    figma.notify("done")
  }

  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
