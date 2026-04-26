import { marked } from 'marked'
import xss from 'xss'

const text = '# Hello\n**Bold**'
const html = marked.parse(text)
console.log('Marked Keys:', Object.keys(marked))
console.log('HTML Output:', html)
console.log('XSS Output:', xss(html))
