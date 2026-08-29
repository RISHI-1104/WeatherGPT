import { motion } from 'framer-motion'

interface DemoScenario {
  id: string
  emoji: string
  title: string
  subtitle: string
  location: string
  question: string
  description: string
}

const SCENARIOS: DemoScenario[] = [
  {
    id: 'farmer',
    emoji: '🌾',
    title: 'Farmer',
    subtitle: 'Nagpur, Maharashtra',
    location: 'Nagpur',
    question: 'Should I irrigate my paddy field tomorrow? What are the rainfall chances?',
    description: 'Agri advisory — irrigation decision based on rainfall forecast',
  },
  {
    id: 'citizen',
    emoji: '🚨',
    title: 'Citizen Alert',
    subtitle: 'Chennai, Tamil Nadu',
    location: 'Chennai',
    question: 'Is there any severe weather warning near me? Should I avoid travel today?',
    description: 'Safety advisory — triggers alert check + banner display',
  },
  {
    id: 'researcher',
    emoji: '📊',
    title: 'Researcher',
    subtitle: 'Mumbai, Maharashtra',
    location: 'Mumbai',
    question: 'Give me an analysis of the 7-day rainfall trend for Mumbai and its implications for urban flooding.',
    description: 'Data analysis — 7-day trend + hydrological insight',
  },
]

interface DemoPanelProps {
  isOpen: boolean
  onSelectScenario: (location: string, question: string) => void
}

export default function DemoMode({ isOpen, onSelectScenario }: DemoPanelProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="glass-card w-full overflow-hidden"
      style={{ background: 'rgba(88, 28, 235, 0.12)', borderColor: 'rgba(139, 92, 246, 0.30)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎬</span>
        <div>
          <p className="text-label" style={{ color: 'rgba(167, 139, 250, 0.9)' }}>Demo Mode</p>
          <h3 className="font-bold text-white">Judging Scenarios</h3>
        </div>
        <p className="ml-auto text-xs text-secondary-color">
          Click any scenario to pre-load it
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SCENARIOS.map((scenario, i) => (
          <motion.button
            key={scenario.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectScenario(scenario.location, scenario.question)}
            className="glass-hover glass p-4 rounded-2xl text-left flex flex-col gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{scenario.emoji}</span>
              <div>
                <p className="font-bold text-white text-sm">{scenario.title}</p>
                <p className="text-xs text-secondary-color">{scenario.subtitle}</p>
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed italic">"{scenario.question}"</p>
            <p className="text-label mt-1" style={{ fontSize: '0.6rem' }}>
              {scenario.description}
            </p>
          </motion.button>
        ))}
      </div>

      <p className="text-center text-xs text-muted mt-3">
        ⚡ Scenarios auto-fill location + chat — no typing needed for live demos
      </p>
    </motion.div>
  )
}
