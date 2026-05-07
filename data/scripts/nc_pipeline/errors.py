class NCPipelineError(Exception):
    """Base class for NC pipeline errors."""


class FetchError(NCPipelineError):
    """Remote source could not be fetched."""


class ParseError(NCPipelineError):
    """Source response could not be parsed."""


class ValidationError(NCPipelineError):
    """Parsed data did not pass validation."""


class MappingError(NCPipelineError):
    """Source data could not be mapped to canonical names."""

