import type { FaceId, Project } from '../types'
import { BOX_LABELS } from '../materials'
import type { BoxModel, BuildContext, NetBuildResult } from './types'
import { buildTuckBox } from './tuck'
import { buildMailerBox } from './mailer'
import { buildLidbaseBox } from './lidbase'

export type {
  BoxModel,
  NetModel,
  NetPanel,
  NetFold,
  NetDimension,
  NetLabel,
  NetSection,
  SceneFace,
  SceneGroup,
} from './types'

export function buildBoxModel(project: Project): BoxModel {
  const ctx: BuildContext = {
    project,
    length: project.dimensions.length,
    width: project.dimensions.width,
    height: project.dimensions.height,
  }
  let result: NetBuildResult
  switch (project.boxType) {
    case 'mailer':
      result = buildMailerBox(ctx)
      break
    case 'lidbase':
      result = buildLidbaseBox(ctx)
      break
    case 'tuck':
    default:
      result = buildTuckBox(ctx)
      break
  }
  const meta = BOX_LABELS[project.boxType]
  return {
    type: project.boxType,
    name: meta.zh,
    nameEn: meta.en,
    ...result,
  }
}

export function getFaceInfo(project: Project): { id: FaceId; label: string }[] {
  return buildBoxModel(project).faceInfo
}
