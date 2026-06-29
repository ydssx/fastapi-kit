import type { Pipeline, Project } from '../types/api'

const PUBLISH_STEP_KEY = 'publish'

export interface RankedProject {
  project: Project
  pipeline?: Pipeline
  stepIndex: number
  stepNum: number
  totalSteps: number
  stepTitle: string
  progressPct: number
  isCompleted: boolean
  isPublishStep: boolean
  isSprintCandidate: boolean
  stepsRemaining: number
  sprintLabel: string
  sprintSummary: string
  nextAction: string
  ctaLabel: string
}

export interface ProjectPriorityView {
  activeProjects: RankedProject[]
  sprintProjects: RankedProject[]
  otherActiveProjects: RankedProject[]
  completedProjects: RankedProject[]
}

function sortByUpdatedAt(items: RankedProject[]): RankedProject[] {
  return [...items].sort(
    (a, b) => new Date(b.project.updated_at).getTime() - new Date(a.project.updated_at).getTime(),
  )
}

function getLateStageStart(totalSteps: number): number {
  return Math.max(1, totalSteps - Math.ceil(totalSteps / 3) + 1)
}

function rankProject(project: Project, pipeline?: Pipeline): RankedProject {
  const stepIndex = pipeline?.steps.findIndex((step) => step.key === project.current_step_key) ?? -1
  const totalSteps = pipeline?.steps.length ?? 0
  const safeStepNum = stepIndex >= 0 ? stepIndex + 1 : 0
  const stepTitle = pipeline?.steps[stepIndex]?.title ?? project.current_step_key
  const isCompleted = project.status === 'completed'
  const isPublishStep = project.current_step_key === PUBLISH_STEP_KEY && !isCompleted
  const stepsRemaining = totalSteps > 0 ? Math.max(totalSteps - safeStepNum, 0) : 0
  const isLateStage =
    !isCompleted && totalSteps > 0 && safeStepNum >= getLateStageStart(totalSteps) && !isPublishStep
  const isSprintCandidate = isPublishStep || isLateStage
  const progressPct =
    totalSteps > 0 ? Math.round(((isCompleted ? totalSteps : safeStepNum) / totalSteps) * 100) : 0

  if (isPublishStep) {
    return {
      project,
      pipeline,
      stepIndex,
      stepNum: safeStepNum,
      totalSteps,
      stepTitle,
      progressPct,
      isCompleted,
      isPublishStep,
      isSprintCandidate,
      stepsRemaining: 0,
      sprintLabel: '发布冲刺',
      sprintSummary: project.publish_progress?.summary_label ?? '发布核对中',
      nextAction: '完成剩余平台核对，结束这个内容项目。',
      ctaLabel: '继续发布核对 →',
    }
  }

  const remainingLabel = stepsRemaining <= 1 ? '距发布还差 1 步' : `距发布还差 ${stepsRemaining} 步`
  const actionDetail =
    stepsRemaining <= 1
      ? `完成「${stepTitle}」后进入发布核对。`
      : `先推进「${stepTitle}」，继续向发布核对靠近。`

  return {
    project,
    pipeline,
    stepIndex,
    stepNum: safeStepNum,
    totalSteps,
    stepTitle,
    progressPct,
    isCompleted,
    isPublishStep,
    isSprintCandidate,
    stepsRemaining,
    sprintLabel: remainingLabel,
    sprintSummary:
      totalSteps > 0 ? `当前在第 ${safeStepNum}/${totalSteps} 步 · ${stepTitle}` : `当前步骤 · ${stepTitle}`,
    nextAction: actionDetail,
    ctaLabel: '继续创作 →',
  }
}

function compareSprintProjects(a: RankedProject, b: RankedProject): number {
  if (a.isPublishStep !== b.isPublishStep) return a.isPublishStep ? -1 : 1
  if (a.stepsRemaining !== b.stepsRemaining) return a.stepsRemaining - b.stepsRemaining
  if (a.progressPct !== b.progressPct) return b.progressPct - a.progressPct
  return new Date(b.project.updated_at).getTime() - new Date(a.project.updated_at).getTime()
}

export function buildProjectPriorityView(
  projects: Project[],
  pipelines: Pipeline[],
): ProjectPriorityView {
  const pipelinesById = new Map(pipelines.map((pipeline) => [pipeline.id, pipeline]))
  const rankedProjects = projects.map((project) =>
    rankProject(project, pipelinesById.get(project.pipeline_id)),
  )

  const completedProjects = sortByUpdatedAt(rankedProjects.filter((item) => item.isCompleted))
  const activeProjects = sortByUpdatedAt(rankedProjects.filter((item) => !item.isCompleted))
  const sprintProjects = [...activeProjects.filter((item) => item.isSprintCandidate)].sort(
    compareSprintProjects,
  )
  const sprintProjectIds = new Set(sprintProjects.map((item) => item.project.id))
  const otherActiveProjects = activeProjects.filter((item) => !sprintProjectIds.has(item.project.id))

  return {
    activeProjects,
    sprintProjects,
    otherActiveProjects,
    completedProjects,
  }
}
