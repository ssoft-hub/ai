'use strict';

// A tool name is an open set, so what a call does is read off its payload: the shell
// command it carries, the file it names together with the content written there, and
// whether it was asked to run in the background.
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

function commandIn(input) {
  const command = input?.command;
  return typeof command === 'string' && command.trim() ? command : '';
}

function writePathIn(input, toolName) {
  const target = input?.file_path ?? input?.path ?? input?.notebook_path ?? '';
  if (!target) return '';
  const content = input?.content ?? input?.new_string ?? input?.new_source ?? input?.edits;
  return EDIT_TOOLS.has(toolName) || content !== undefined ? target : '';
}

function backgroundIn(input) {
  return input?.run_in_background === true;
}

module.exports = { commandIn, writePathIn, backgroundIn };
