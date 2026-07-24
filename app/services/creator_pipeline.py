from app.creator import pipelines as pipelines_module
from app.schemas.creator import PipelineOut, PipelineStepOut


class CreatorPipelineService:
    def list_pipelines(self) -> list[PipelineOut]:
        result: list[PipelineOut] = []
        for pipeline in pipelines_module.PIPELINES.values():
            result.append(
                PipelineOut(
                    id=pipeline.id,
                    title=pipeline.title,
                    description=pipeline.description,
                    steps=[
                        PipelineStepOut(
                            key=s.key,
                            title=s.title,
                            description=s.description,
                            ai_enabled=s.ai_enabled,
                        )
                        for s in pipeline.steps
                    ],
                )
            )
        return result
