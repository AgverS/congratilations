import './style.css'
import { people, type Person } from './people'

const id = location.pathname.replace(/\//g, '') as Person['id']
const app = document.getElementById('app')!

if (people[id]) {
  const p = people[id]
  document.title = p.title
  document.documentElement.classList.add(`t-${p.id}`)
  void import('./story').then((m) => m.mount(app, p))
} else {
  // главная страница — только для автора: выбор открытки
  document.title = 'Открытки'
  app.innerHTML = `<div class="home"><h1 class="big">Для <em>кого</em>?</h1>
    ${Object.values(people)
      .map((p) => `<a href="/${p.id}">${p.word.toLowerCase()}</a>`)
      .join('')}</div>`
}
