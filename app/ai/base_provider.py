from abc import ABC, abstractmethod


class BaseProvider(ABC):
    @abstractmethod
    def ask(self, question, context="", system_prompt=""):
        """Return an answer for the given question and optional context."""
        raise NotImplementedError
