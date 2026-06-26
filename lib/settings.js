'use strict';

// Pure helpers for the additive settings.json merge shared by install.js and
// uninstall.js. install merges the repo's hooks/permissions in and records the
// exact items added; uninstall (and a reinstall) subtract precisely those, so a
// user's or another tool's settings are never clobbered.

function mergeUnique(existing, incoming) {
  return [...new Set([...existing, ...incoming])];
}

// Append the incoming hook entries whose command is not already present, and
// report which command strings were actually added.
function mergeHookEvent(existing, incoming) {
  const existingCmds = new Set();
  for (const entry of existing)
    for (const h of (entry.hooks || []))
      if (h.command) existingCmds.add(h.command);

  const result = [...existing];
  const addedCommands = [];
  for (const entry of incoming) {
    const newHooks = (entry.hooks || []).filter(h => !existingCmds.has(h.command));
    if (newHooks.length) {
      result.push({ ...entry, hooks: newHooks });
      for (const h of newHooks) if (h.command) addedCommands.push(h.command);
    }
  }
  return { result, addedCommands };
}

// Merge repo hooks/permissions into existing, returning the merged object and a
// record of the exact additions (hook commands per event, permission entries per
// key) for later subtraction.
function mergeSettings(existing, repo) {
  const out = structuredClone(existing);
  const additions = { hooks: {}, permissions: {} };

  if (repo.hooks) {
    out.hooks = out.hooks || {};
    for (const [ev, entries] of Object.entries(repo.hooks)) {
      const { result, addedCommands } = mergeHookEvent(out.hooks[ev] || [], entries);
      out.hooks[ev] = result;
      if (addedCommands.length) additions.hooks[ev] = addedCommands;
    }
  }

  if (repo.permissions) {
    out.permissions = out.permissions || {};
    for (const key of ['allow', 'ask', 'deny']) {
      if (!repo.permissions[key]) continue;
      const existingArr = out.permissions[key] || [];
      const existingSet = new Set(existingArr);
      const addedPerms = repo.permissions[key].filter(p => !existingSet.has(p));
      out.permissions[key] = mergeUnique(existingArr, repo.permissions[key]);
      if (addedPerms.length) additions.permissions[key] = addedPerms;
    }
  }

  return { out, additions };
}

// Additions when settings.json is created from scratch — everything the repo
// settings contribute (the whole managed surface is install-owned).
function additionsFromRepo(repo) {
  const additions = { hooks: {}, permissions: {} };
  for (const [ev, entries] of Object.entries(repo.hooks || {})) {
    const cmds = [];
    for (const entry of entries)
      for (const h of (entry.hooks || []))
        if (h.command) cmds.push(h.command);
    if (cmds.length) additions.hooks[ev] = cmds;
  }
  for (const key of ['allow', 'ask', 'deny'])
    if (repo.permissions?.[key]?.length) additions.permissions[key] = [...repo.permissions[key]];
  return additions;
}

// Remove exactly the recorded additions from a settings object, pruning emptied
// hook entries/events and permission keys. Mutates and returns `settings`.
function subtractAdditions(settings, additions = {}) {
  for (const [ev, cmds] of Object.entries(additions.hooks || {})) {
    if (!settings.hooks?.[ev]) continue;
    const rm = new Set(cmds);
    settings.hooks[ev] = settings.hooks[ev]
      .map(entry => ({ ...entry, hooks: (entry.hooks || []).filter(h => !rm.has(h.command)) }))
      .filter(entry => (entry.hooks || []).length > 0);
    if (settings.hooks[ev].length === 0) delete settings.hooks[ev];
  }
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;

  for (const [key, vals] of Object.entries(additions.permissions || {})) {
    if (!settings.permissions?.[key]) continue;
    const rm = new Set(vals);
    settings.permissions[key] = settings.permissions[key].filter(p => !rm.has(p));
    if (settings.permissions[key].length === 0) delete settings.permissions[key];
  }
  if (settings.permissions && Object.keys(settings.permissions).length === 0) delete settings.permissions;

  return settings;
}

// True when nothing but an optional $schema key remains.
function isEffectivelyEmpty(settings) {
  return Object.keys(settings).filter(k => k !== '$schema').length === 0;
}

module.exports = {
  mergeUnique,
  mergeHookEvent,
  mergeSettings,
  additionsFromRepo,
  subtractAdditions,
  isEffectivelyEmpty,
};
