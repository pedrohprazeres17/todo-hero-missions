import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 📚 CONCEITOS DOM UTILIZADOS NESTE COMPONENTE:
 * 
 * 1. useRef() -> Referências diretas aos elementos DOM (similar ao document.getElementById)
 * 2. focus() e select() -> Gerenciamento de foco para melhor UX
 * 3. addEventListener/removeEventListener -> Event listeners nativos do DOM
 * 4. querySelectorAll() -> Query selectors para encontrar elementos focalizáveis
 * 5. preventDefault() e stopPropagation() -> Controle de eventos
 * 6. localStorage -> Web API para persistência de dados no navegador
 * 7. document.activeElement -> Elemento que possui foco atualmente
 * 8. ARIA attributes -> Acessibilidade para leitores de tela
 */

interface Task {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
}

type Filter = 'all' | 'pending' | 'completed';

const TodoHeroes = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskPendingDeleteId, setTaskPendingDeleteId] = useState<number | null>(null);
  const [taskPendingDeleteText, setTaskPendingDeleteText] = useState('');
  const [undoTaskData, setUndoTaskData] = useState<Task | null>(null);
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  // 📍 MANIPULAÇÃO DOM COM useRef() - Alternativa React ao document.getElementById()
  // Estas referências permitem acesso direto aos elementos DOM sem quebrar o paradigma React
  const editInputRef = useRef<HTMLInputElement>(null);      // Input de edição inline
  const newTaskInputRef = useRef<HTMLInputElement>(null);   // Input para nova tarefa
  const deleteButtonRef = useRef<HTMLButtonElement>(null);  // Botão de deletar (para retorno de foco)
  const modalRef = useRef<HTMLDivElement>(null);            // Modal (para focus trap)

  // LocalStorage keys
  const TASKS_KEY = 'todoHeroes:v1:tasks';
  const FILTER_KEY = 'todoHeroes:v1:filter';

  // Load data on mount
  useEffect(() => {
    loadTasks();
    loadFilter();
  }, []);

  // 🎯 GERENCIAMENTO DE FOCO COM useEffect()
  // Quando editingId muda, o React re-executa este efeito
  // Usamos editInputRef.current para acessar o elemento DOM diretamente
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();    // Move o foco para o input
      editInputRef.current.select();   // Seleciona todo o texto para facilitar edição
    }
  }, [editingId]);

  // 💾 WEB API - LOCALSTORAGE PARA PERSISTÊNCIA DE DADOS
  // localStorage é uma Web API nativa do navegador para armazenar dados localmente
  // Os dados persistem mesmo após fechar o navegador (diferente de sessionStorage)
  const loadTasks = () => {
    try {
      const saved = localStorage.getItem(TASKS_KEY);  // Lê dados do navegador
      if (saved) {
        setTasks(JSON.parse(saved));                  // Converte JSON string para objeto
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadFilter = () => {
    try {
      const saved = localStorage.getItem(FILTER_KEY);
      if (saved && ['all', 'pending', 'completed'].includes(saved)) {
        setFilter(saved as Filter);
      }
    } catch (error) {
      console.error('Error loading filter:', error);
    }
  };

  const saveTasks = (newTasks: Task[]) => {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks)); // Salva no navegador
      setTasks(newTasks);
    } catch (error) {
      console.error('Error saving tasks:', error);
      toast.error('Erro ao salvar tarefas');
    }
  };

  const saveFilter = (newFilter: Filter) => {
    try {
      localStorage.setItem(FILTER_KEY, newFilter);
      setFilter(newFilter);
    } catch (error) {
      console.error('Error saving filter:', error);
    }
  };

  const addTask = (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Avoid consecutive duplicates
    const lastTask = tasks[tasks.length - 1];
    if (lastTask && lastTask.text === trimmedText) {
      toast.error('Tarefa duplicada não pode ser adicionada consecutivamente');
      return;
    }

    const newTask: Task = {
      id: Date.now(),
      text: trimmedText,
      done: false,
      createdAt: Date.now()
    };

    const newTasks = [...tasks, newTask];
    saveTasks(newTasks);
    setNewTaskText('');
    
    // 🎯 GERENCIAMENTO DE FOCO - Manter produtividade do usuário
    // Após adicionar tarefa, foco retorna automaticamente ao input para próxima tarefa
    if (newTaskInputRef.current) {
      newTaskInputRef.current.focus();  // focus() é método nativo do DOM
    }

    toast.success('Missão adicionada com sucesso!');
  };

  const toggleDone = (id: number) => {
    const newTasks = tasks.map(task =>
      task.id === id ? { ...task, done: !task.done } : task
    );
    saveTasks(newTasks);
    
    const task = tasks.find(t => t.id === id);
    if (task) {
      toast.success(task.done ? 'Missão reativada!' : 'Missão concluída! 🎉');
    }
  };

  const openDeleteModal = (id: number) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setTaskPendingDeleteId(id);
    setTaskPendingDeleteText(taskToDelete.text);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTaskPendingDeleteId(null);
    setTaskPendingDeleteText('');
    
    // 🔄 RETORNA FOCO PARA ELEMENTO ORIGINAL (UX)
    // Após fechar modal, devolvemos foco para o botão que iniciou a ação
    // setTimeout garante que o modal seja removido do DOM antes de focar
    setTimeout(() => {
      if (deleteButtonRef.current) {
        deleteButtonRef.current.focus();  // Foco volta para botão 🗑️
      }
    }, 100);
  };

  const confirmDeleteTask = () => {
    if (!taskPendingDeleteId) return;

    const taskToDelete = tasks.find(t => t.id === taskPendingDeleteId);
    if (!taskToDelete) return;

    const newTasks = tasks.filter(task => task.id !== taskPendingDeleteId);
    saveTasks(newTasks);
    
    // Store for potential undo
    setUndoTaskData(taskToDelete);
    
    // Show toast with undo option
    const toastId = toast.success('Missão excluída', {
      action: {
        label: 'Desfazer',
        onClick: () => undoDelete(),
      },
      duration: 3000,
    });

    // Clear undo data after 3 seconds
    const timeoutId = setTimeout(() => {
      setUndoTaskData(null);
    }, 3000);
    
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    setUndoTimeoutId(timeoutId);
    
    closeDeleteModal();
  };

  const undoDelete = () => {
    if (!undoTaskData) return;

    const newTasks = [...tasks, undoTaskData].sort((a, b) => a.createdAt - b.createdAt);
    saveTasks(newTasks);
    setUndoTaskData(null);
    
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId);
      setUndoTimeoutId(null);
    }
    
    toast.success('Missão restaurada!');
  };

  const startEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const trimmedText = editText.trim();
    if (!trimmedText) {
      toast.error('Texto da missão não pode estar vazio');
      return;
    }

    const newTasks = tasks.map(task =>
      task.id === editingId ? { ...task, text: trimmedText } : task
    );
    saveTasks(newTasks);
    setEditingId(null);
    setEditText('');
    toast.success('Missão editada com sucesso!');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const clearCompleted = () => {
    const completedCount = tasks.filter(t => t.done).length;
    if (completedCount === 0) return;

    const newTasks = tasks.filter(task => !task.done);
    saveTasks(newTasks);
    toast.success(`${completedCount} missão(ões) concluída(s) removida(s)`);
  };

  // Filter tasks based on current filter
  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending':
        return !task.done;
      case 'completed':
        return task.done;
      default:
        return true;
    }
  });

  // Counters
  const pendingCount = tasks.filter(t => !t.done).length;
  const completedCount = tasks.filter(t => t.done).length;
  const hasCompleted = completedCount > 0;

  // ⌨️ EVENT HANDLERS PARA NAVEGAÇÃO POR TECLADO
  // Melhora acessibilidade permitindo interação sem mouse
  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {  // Detecta tecla Enter
      action();               // Executa ação (equivale ao clique)
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();             // Enter = salvar edição
    } else if (e.key === 'Escape') {
      cancelEdit();           // Esc = cancelar edição
    }
  };

  const handleModalKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeDeleteModal();     // Esc = fechar modal
    } else if (e.key === 'Enter') {
      confirmDeleteTask();    // Enter = confirmar exclusão
    }
  };

  // 🔒 FOCUS TRAP - CONCEITO AVANÇADO DE ACESSIBILIDADE
  // Prende o foco dentro do modal, essencial para usuários que navegam por teclado
  useEffect(() => {
    if (showDeleteModal && modalRef.current) {
      // 🔍 QUERY SELECTOR - Encontra todos elementos focalizáveis dentro do modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      // 🔄 EVENT LISTENER NATIVO - Captura eventos de teclado
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {  // Shift+Tab (navegação reversa)
            if (document.activeElement === firstElement) {
              e.preventDefault();  // Previne comportamento padrão
              lastElement.focus();  // Vai para último elemento
            }
          } else {  // Tab normal (navegação para frente)
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();  // Volta para primeiro elemento
            }
          }
        }
      };

      // 📎 ADICIONA EVENT LISTENER ao documento
      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();  // Foca primeiro elemento ao abrir modal

      // 🧹 CLEANUP - Remove event listener ao desmontar (importante!)
      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [showDeleteModal]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 hero-gradient bg-clip-text text-transparent">
            ToDo List
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Organize suas missões e conquiste seus objetivos
          </p>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-primary">{pendingCount} pendentes</span>
            <span className="mx-2">•</span>
            <span className="font-medium text-green-400">{completedCount} concluídas</span>
          </div>
        </header>

        {/* Add Task Section */}
        <div className="bg-card rounded-lg p-6 card-shadow mb-6">
          <div className="flex gap-3">
            <Input
              ref={newTaskInputRef}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, () => addTask(newTaskText))}
              placeholder="Descreva sua missão..."
              className="flex-1 transition-smooth focus:ring-2 focus:ring-primary"
            />
            <Button
              onClick={() => addTask(newTaskText)}
              className="hero-gradient hover:opacity-90 transition-smooth px-6"
            >
              Adicionar missão
            </Button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todas' },
              { key: 'pending', label: 'Pendentes' },
              { key: 'completed', label: 'Concluídas' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                size="sm"
                onClick={() => saveFilter(key as Filter)}
                className={`transition-smooth ${
                  filter === key ? 'filter-active' : 'hover:border-primary'
                }`}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Clear Completed */}
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompleted}
            disabled={!hasCompleted}
            className="transition-smooth hover:border-destructive hover:text-destructive disabled:opacity-50"
          >
            Limpar concluídas
          </Button>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-card rounded-lg p-8 card-shadow text-center">
              <CheckCircle2 className="mx-auto mb-4 text-muted-foreground" size={48} />
              <h3 className="text-lg font-medium mb-2 text-muted-foreground">
                {tasks.length === 0 
                  ? 'Sem missões por enquanto'
                  : filter === 'pending' 
                    ? 'Nenhuma missão pendente'
                    : filter === 'completed'
                      ? 'Nenhuma missão concluída'
                      : 'Nenhuma missão encontrada'
                }
              </h3>
              <p className="text-muted-foreground">
                {tasks.length === 0 ? 'Crie a primeira!' : 'Experimente outro filtro'}
              </p>
            </div>
          ) : (
            // 📋 LISTA SEMÂNTICA COM ROLES ARIA - Acessibilidade para leitores de tela
            <ul role="list" className="space-y-3">
              {filteredTasks.map((task) => (
                <li
                  key={task.id}
                  role="listitem"  // Define semanticamente como item de lista
                  className={`bg-card rounded-lg p-4 card-shadow hover:card-shadow-hover transition-smooth ${
                    task.done ? 'task-completed' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={() => toggleDone(task.id)}
                      className="transition-fast"
                      aria-label={`Marcar como ${task.done ? 'pendente' : 'concluída'}`}  // Label para leitores de tela
                    />
                    
                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <Input
                          ref={editInputRef}  // Referência DOM para foco automático
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyPress}  // Navegação por teclado
                          onBlur={saveEdit}               // Salva ao perder foco
                          className="text-sm transition-smooth"
                        />
                      ) : (
                        <span
                          className={`text-sm ${task.done ? 'line-through' : ''} cursor-pointer`}
                          onClick={() => startEdit(task.id, task.text)}
                        >
                          {task.text}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(task.id, task.text)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary transition-smooth"
                        aria-label="Editar missão"  // Accessibility label
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        ref={deleteButtonRef}  // Ref para retorno de foco após modal
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteModal(task.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-smooth"
                        aria-label="Excluir missão"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress Bar (Bonus) */}
        {tasks.length > 0 && (
          <div className="mt-8 bg-card rounded-lg p-4 card-shadow">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progresso das missões</span>
              <span className="text-sm text-muted-foreground">
                {Math.round((completedCount / tasks.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="hero-gradient h-2 rounded-full transition-smooth"
                style={{ width: `${(completedCount / tasks.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={closeDeleteModal}  // Clique fora fecha modal
            onKeyDown={handleModalKeyPress}  // Navegação por teclado
            role="dialog"                    // ARIA role para acessibilidade
            aria-modal="true"                // Indica que é um modal
            aria-labelledby="delete-modal-title"      // ID do título (ARIA)
            aria-describedby="delete-modal-description" // ID da descrição (ARIA)
          >
            <div
              ref={modalRef}  // Referência DOM para focus trap
              className="relative w-full max-w-md bg-card rounded-2xl border border-primary/20 shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}  // 🛑 STOP PROPAGATION - Evita fechar modal ao clicar dentro
              style={{
                background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)/0.95) 100%)',
                borderImage: 'linear-gradient(135deg, #3B2FBF, #6CA4FF) 1',
              }}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 p-6 pb-4">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <h2 
                  id="delete-modal-title" 
                  className="text-lg font-semibold hero-gradient bg-clip-text text-transparent"
                >
                  Excluir missão?
                </h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={closeDeleteModal}
                  className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="Fechar modal"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="px-6 pb-6">
                <p 
                  id="delete-modal-description" 
                  className="text-sm text-muted-foreground mb-6"
                >
                  Tem certeza que deseja excluir a missão{' '}
                  <span className="font-medium text-foreground truncate inline-block max-w-[200px]">
                    "{taskPendingDeleteText}"
                  </span>
                  ? Esta ação não poderá ser desfeita.
                </p>

                {/* Modal Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                  <Button
                    variant="outline"
                    onClick={closeDeleteModal}
                    className="transition-smooth hover:border-primary focus:ring-2 focus:ring-primary"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmDeleteTask}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-2 focus:ring-destructive transition-smooth"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoHeroes;