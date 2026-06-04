import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { userService, UserProfile } from './services/userService';
import { medicationService, Medication, IntakeLog } from './services/medicationService';
import { 
  Plus, 
  Settings, 
  LogOut, 
  Pill, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  size = 'md' 
}: { 
  children: React.ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; 
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'hover:bg-slate-100 text-slate-600',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 font-semibold',
    lg: 'px-6 py-3 text-lg font-semibold',
    xl: 'px-8 py-3 text-lg font-bold',
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        'rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) => (
  <div id={id} className={cn('bg-white rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-slate-200', className)}>
    {children}
  </div>
);

// --- Pages ---

const LoginPage = ({ onLogin, error }: { onLogin: () => void; error?: string | null }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full space-y-8"
    >
      <div className="flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Pill className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-4xl font-display font-bold text-neutral-900 mb-2">Cuidado Ativo</h1>
        <p className="text-neutral-500 text-lg">
          Seu companheiro diário para um controle de medicação seguro e fácil.
        </p>
      </div>

      <Button onClick={onLogin} variant="primary" size="xl" className="w-full">
        <img src="https://www.google.com/favicon.ico" className="w-6 h-6 mr-2" alt="" />
        Entrar com Google
      </Button>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
          Erro ao entrar: {error}
        </div>
      ) : null}

      <p className="text-sm text-neutral-400">
        Desenvolvido para facilitar a vida de idosos e cuidadores.
      </p>
    </motion.div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<IntakeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'add' | 'settings'>('dashboard');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
      setLoginError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const p = await userService.ensureUserProfile(u);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user && profile) {
      const unsubMeds = medicationService.subscribeToMedications(user.uid, setMeds);
      const unsubLogs = medicationService.subscribeToLogs(user.uid, setLogs);
      return () => {
        unsubMeds();
        unsubLogs();
      };
    }
  }, [user, profile]);

  const updatePreferences = async (newPrefs: Partial<UserProfile['preferences']>) => {
    if (!user || !profile) return;
    try {
      await userService.updatePreferences(user.uid, {
        ...profile.preferences,
        ...newPrefs
      });
      setProfile(p => p ? ({ ...p, preferences: { ...p.preferences, ...newPrefs } }) : null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Clock className="w-12 h-12 text-blue-600 opacity-20" />
        </motion.div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleGoogleSignIn} error={loginError} />;

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 font-sans flex",
      profile?.preferences.fontSize === 'large' && "text-xl",
      profile?.preferences.fontSize === 'extra-large' && "text-2xl"
    )}>
      {/* Sidebar for Desktop */}
      <aside className="w-72 bg-brand-sidebar text-white hidden lg:flex flex-col sticky top-0 h-screen shrink-0">
        <div className="p-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white">C</div>
            <h1 className="text-2xl font-bold tracking-tight">Cuidado</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2 font-bold">Monitoramento Ativo</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              view === 'dashboard' ? "bg-slate-700 border-l-4 border-blue-500" : "hover:bg-slate-800 text-slate-300"
            )}
          >
            <Clock className="w-5 h-5" /> Medicamentos
          </button>
          <button 
             onClick={() => setView('add')}
             className={cn(
               "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
               view === 'add' ? "bg-slate-700 border-l-4 border-blue-500" : "hover:bg-slate-800 text-slate-300"
             )}
          >
            <Plus className="w-5 h-5" /> Adicionar
          </button>
          <button 
            onClick={() => setView('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
              view === 'settings' ? "bg-slate-700 border-l-4 border-blue-500" : "hover:bg-slate-800 text-slate-300"
            )}
          >
            <Settings className="w-5 h-5" /> Ajustes
          </button>
        </nav>

        <div className="p-6 mt-auto border-t border-slate-700">
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Cloud Status</p>
            <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[85%]" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Firebase Conectado</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-20 shrink-0">
          <div>
            <h2 className="text-lg text-slate-500 font-medium whitespace-nowrap">
              Bem-vindo, <span className="font-bold text-slate-900">{user.displayName?.split(' ')[0]}</span>
            </h2>
          </div>
          <div className="flex gap-4">
            <Button variant="primary" size="md" onClick={() => setView('add')} className="hidden lg:flex">
              <Plus className="w-4 h-4" /> Novo Registro
            </Button>
            <Button variant="ghost" onClick={() => signOut(auth)} className="p-2 h-10 w-10 rounded-full lg:hidden">
              <LogOut className="w-6 h-6" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
              {user.displayName?.[0]}
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-10 flex-1 overflow-auto bg-slate-50">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                <div className="lg:col-span-2 space-y-8">
                  <section>
                    <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Próximas Doses Hoje</h3>
                    {meds.length === 0 ? (
                      <Card className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p>Nenhum medicamento agendado.</p>
                      </Card>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {meds.map((med) => (
                          <div key={med.id}>
                            <Card className="hover:shadow-md transition-shadow group flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-2xl border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                                  {/* Just a simple emoji representation or icon */}
                                  💊
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900">{med.name}</h4>
                                  <p className="text-slate-500 text-sm">{med.dosage} • {med.frequency} • <span className="font-semibold text-slate-700">{med.times[0]}</span></p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Pendente</span>
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    medicationService.addIntakeLog(user.uid, {
                                      medicationId: med.id,
                                      scheduledTime: new Date(),
                                      status: 'taken'
                                    });
                                  }}
                                >
                                  Confirmar
                                </Button>
                              </div>
                            </Card>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-8">
                  <Card className="h-full flex flex-col p-0 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-bold text-slate-900">Histórico Recente</h3>
                    </div>
                    <div className="p-6 flex-1 space-y-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Últimas 24 Horas</p>
                      <div className="space-y-4">
                        {logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="flex gap-4 items-start">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                               <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div className="text-sm">
                              <p className="text-slate-900 font-semibold mb-1">Medicamento Tomado</p>
                              <p className="text-slate-500 text-xs">{format(log.createdAt?.toDate() || new Date(), 'HH:mm • dd/MM')}</p>
                            </div>
                          </div>
                        ))}
                        {logs.length === 0 && (
                          <p className="text-sm text-slate-400 italic">Sem registros recentes.</p>
                        )}
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                       <Button variant="secondary" className="w-full bg-white border border-blue-500 text-blue-600 hover:bg-blue-50">
                          Ver Relatório Completo
                       </Button>
                    </div>
                  </Card>
                </aside>
              </motion.div>
            )}

            {view === 'add' && (
               <motion.div 
                 key="add"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 className="max-w-2xl mx-auto py-4"
               >
                  <Card>
                    <header className="flex items-center justify-between mb-8">
                      <h3 className="text-2xl font-bold text-slate-900">Novo Medicamento</h3>
                      <Button variant="ghost" onClick={() => setView('dashboard')}>Cancelar</Button>
                    </header>
                    
                    <MedicationForm 
                      onSave={async (data) => {
                        await medicationService.addMedication(user.uid, data);
                        setView('dashboard');
                      }} 
                    />
                  </Card>
               </motion.div>
            )}

            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl mx-auto py-4"
              >
                <Card>
                  <header className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-slate-900">Configurações</h3>
                    <Button variant="ghost" onClick={() => setView('dashboard')}>Voltar</Button>
                  </header>

                  <section className="space-y-8">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Acessibilidade</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div>
                            <p className="font-bold text-slate-900">Tamanho da Fonte</p>
                            <p className="text-sm text-slate-500">Melhore a visualização dos dados</p>
                          </div>
                          <select 
                            className="bg-white border border-slate-200 rounded-lg px-4 py-2 font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                            value={profile?.preferences.fontSize}
                            onChange={(e) => {
                              const size = e.target.value as any;
                              updatePreferences({ fontSize: size });
                            }}
                          >
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                            <option value="extra-large">Extra</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                      <Button variant="danger" size="lg" className="w-full" onClick={() => signOut(auth)}>
                        <LogOut className="w-5 h-5" /> Sair da Conta
                      </Button>
                    </div>
                  </section>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer Navigation (only for mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex justify-around items-center z-20 lg:hidden px-4">
         <Button 
            variant="ghost" 
            onClick={() => setView('dashboard')}
            className={view === 'dashboard' ? 'text-blue-600 bg-blue-50' : ''}
         >
           <Clock className="w-6 h-6" />
           <span className="text-xs font-bold font-sans">Hoje</span>
         </Button>
         <Button 
            variant="ghost" 
            onClick={() => setView('add')}
            className={view === 'add' ? 'text-blue-600 bg-blue-50' : ''}
         >
           <Plus className="w-6 h-6" />
           <span className="text-xs font-bold font-sans">Add</span>
         </Button>
         <Button 
            variant="ghost" 
            onClick={() => setView('settings')}
            className={view === 'settings' ? 'text-blue-600 bg-blue-50' : ''}
         >
           <Settings className="w-6 h-6" />
           <span className="text-xs font-bold font-sans">Ajustes</span>
         </Button>
      </nav>
    </div>
  );
}

// --- Form Component ---

function MedicationForm({ onSave }: { onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Diário',
    times: ['08:00'],
    instructions: '',
    active: true
  });

  const addTime = () => setFormData(prev => ({ ...prev, times: [...prev.times, '12:00'] }));
  const updateTime = (index: number, val: string) => {
    const newTimes = [...formData.times];
    newTimes[index] = val;
    setFormData(prev => ({ ...prev, times: newTimes }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome do Medicamento</label>
        <input 
          type="text" 
          placeholder="Ex: Losartana Potássica" 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-shadow focus:bg-white"
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dosagem</label>
          <input 
            type="text" 
            placeholder="Ex: 50mg" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow focus:bg-white"
            value={formData.dosage}
            onChange={e => setFormData(p => ({ ...p, dosage: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frequência</label>
          <select 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow focus:bg-white font-semibold"
            value={formData.frequency}
            onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
          >
            <option>Diário</option>
            <option>2 em 2 dias</option>
            <option>Semanal</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
          Horários de Dose
          <button onClick={addTime} className="text-blue-600 text-xs font-bold hover:underline">+ Novo horário</button>
        </label>
        <div className="flex flex-wrap gap-3">
          {formData.times.map((t, idx) => (
            <input 
              key={idx}
              type="time" 
              className="bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
              value={t}
              onChange={e => updateTime(idx, e.target.value)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instruções de Uso</label>
        <textarea 
          placeholder="Ex: Tomar em jejum com água..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none transition-shadow focus:bg-white"
          value={formData.instructions}
          onChange={e => setFormData(p => ({ ...p, instructions: e.target.value }))}
        />
      </div>

      <Button variant="primary" size="lg" className="w-full mt-4 h-14 shadow-lg shadow-blue-100" onClick={() => onSave(formData)}>
        Confirmar Cadastro
      </Button>
    </div>
  );
}
