import { useState } from 'react'
import { CheckCircle2, Circle, ChevronRight, Sparkles, BookOpen } from 'lucide-react'
import './LearningPath.css'

function LearningPath({ data, onNavigate }) {
    const [steps, setSteps] = useState(data?.learningPath?.steps || [])
    const [currentStep, setCurrentStep] = useState(0)

    const toggleStep = (stepId) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId ? { ...step, completed: !step.completed } : step
        ))
    }

    const completedCount = steps.filter(s => s.completed).length
    const progress = (completedCount / steps.length) * 100

    return (
        <div className="learning-path">
            <div className="path-header">
                <div>
                    <h3>{data?.learningPath?.title || 'Learning Path'}</h3>
                    <p className="text-muted">
                        Follow this AI-generated roadmap to understand the codebase systematically
                    </p>
                </div>
                <div className="progress-badge">
                    <div className="progress-circle">
                        <svg width="60" height="60">
                            <circle
                                cx="30"
                                cy="30"
                                r="25"
                                fill="none"
                                stroke="var(--color-bg-tertiary)"
                                strokeWidth="4"
                            />
                            <circle
                                cx="30"
                                cy="30"
                                r="25"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="4"
                                strokeDasharray={`${progress * 1.57} ${157 - progress * 1.57}`}
                                strokeLinecap="round"
                                transform="rotate(-90 30 30)"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#ec4899" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="progress-text">
                            {completedCount}/{steps.length}
                        </div>
                    </div>
                </div>
            </div>

            <div className="path-timeline">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`timeline-step card ${currentStep === index ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                        onClick={() => setCurrentStep(index)}
                    >
                        <div className="step-connector">
                            {index < steps.length - 1 && <div className="connector-line" />}
                        </div>

                        <div className="step-content">
                            <div className="step-header">
                                <div className="step-indicator">
                                    {step.completed ? (
                                        <CheckCircle2 size={24} className="check-icon" />
                                    ) : (
                                        <Circle size={24} className="circle-icon" />
                                    )}
                                    <span className="step-number">Step {step.id}</span>
                                </div>
                                <button
                                    className={`btn ${step.completed ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggleStep(step.id)
                                    }}
                                >
                                    {step.completed ? 'Mark Incomplete' : 'Mark Complete'}
                                </button>
                            </div>

                            <h4 className="step-title">{step.title}</h4>
                            <p className="step-description text-muted">{step.description}</p>

                            <div className="step-files">
                                {step.files.map((file, idx) => (
                                    <div key={idx} className="file-chip">
                                        <BookOpen size={14} />
                                        {file}
                                    </div>
                                ))}
                            </div>

                            {currentStep === index && (
                                <div className="step-details animate-fade-in">
                                    <div className="ai-guidance">
                                        <div className="guidance-header">
                                            <Sparkles size={16} />
                                            <span>AI Guidance</span>
                                        </div>
                                        <ul>
                                            <li>Start by reading through the file structure</li>
                                            <li>Pay attention to import statements and dependencies</li>
                                            <li>Look for patterns and architectural decisions</li>
                                            <li>Try to understand the data flow</li>
                                        </ul>
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            const filePath = step.files && step.files[0]
                                            onNavigate && onNavigate('explorer', filePath)
                                        }}
                                    >
                                        <ChevronRight size={18} />
                                        Open in Code Explorer
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Completion Message */}
            {completedCount === steps.length && (
                <div className="completion-card card animate-fade-in">
                    <div className="completion-icon">🎉</div>
                    <h3>Congratulations!</h3>
                    <p className="text-muted">
                        You've completed all steps in this learning path. You now have a solid understanding of this codebase!
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            const filePath = undefined // step is not defined here, so filePath will be undefined
                            onNavigate && onNavigate('explorer', filePath)
                        }}
                    >
                        <ChevronRight size={18} />
                        Open in Code Explorer
                    </button>
                </div>
            )}
        </div>
    )
}

export default LearningPath
