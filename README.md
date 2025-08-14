# ToDo Heroes – Missão 2

Gerenciador de tarefas (CRUD) com LocalStorage, filtros e microinterações.

## ✨ Funcionalidades
- Adicionar missão (Enter ou botão)
- Editar inline (Enter salva, Esc cancela)
- Concluir/Desconcluir (checkbox)
- Excluir com **modal de confirmação** (não usa confirm do navegador)
- Filtros: Todas | Pendentes | Concluídas
- Contador e barra de progresso
- Persistência com LocalStorage

## 🛠️ Stack
HTML5 • CSS3 • JavaScript ES6+ (DOM) • LocalStorage

## 📦 Como rodar
Abra `index.html` no navegador (ou use Live Server/Replit).

## 🧠 Organização
`/assets` (ícones/fonts) • `style.css` • `script.js`  
Principais funções: `addTask`, `editTask`, `deleteTask`, `toggleDone`, `renderTasks`, `saveTasks`, `loadTasks`, `setFilter`.

## ♿ Acessibilidade
Labels e aria-* nos botões/ícones, foco visível, navegação por teclado.

## 🔮 Extras
Glow azul no hover, tema escuro padrão, gradiente sutil, progresso visual.
