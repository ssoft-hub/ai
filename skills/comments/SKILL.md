---
name: comments
version: "1.0.0"
description: Apply when writing or reviewing a code comment in any language (inline notes, implementation comments), Doxygen blocks aside
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  paths:
    - "**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,inl,ipp,m,mm,java,cs,go,rs,swift,kt,kts,scala,php,qml,dart,groovy,gradle,glsl,vert,frag,proto}"
    - "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,css,scss,less}"
    - "**/*.{py,pyi,rb,pl,pm,sh,bash,zsh,fish,ps1,psm1,r,jl,ex,exs,nim,yml,yaml,toml,cfg,conf,tf,tfvars,cmake,mk}"
    - "**/*.{sql,lua,hs,elm,ada,adb,ads,vhd,vhdl}"
    - "**/*.{ini,lisp,cl,el,clj,cljs,cljc,scm,rkt,asm,s}"
    - "**/*.{tex,sty,cls,erl,hrl}"
    - "**/*.{html,htm,xhtml,xml,xsl,xslt,svg}"
    - "**/{CMakeLists.txt,Makefile,Dockerfile,Gemfile,Rakefile}"
    - "**/{.env,.gitignore,.gitattributes,.dockerignore,.editorconfig}"
  tags:
    - comments
    - style
---

# Skill: Code Comments

Apply when writing or reviewing a code comment in any language (inline notes, implementation comments), whatever marker opens it — `//`, `/* */`, `#`, `--`, `;`, `%`, `<!-- -->`.

Doxygen blocks on public C++ headers → `cpp-doxygen` skill. This skill covers every other comment, in every language: inside function bodies, in implementation files, in a hook script, a build file or a configuration file. C++ implementation conventions (types, RAII, naming) → `cpp-coding` skill.

---

## Philosophy

Code documents itself. **The default is no comment.** Add one only when, without it, a careful reader would get a critical, non-obvious fact wrong — never to restate what the code already shows.

- **Default to none** — first make the code self-explanatory (better names, extracted function, clearer types). "Might help the reader" is not enough; the bar is that they get it *wrong* without the line.
- **Keep it short** — one line. No multi-line prose blocks outside a documentation block.
- **General character, not case history** — state a timeless fact about the code (an invariant, a constraint, a non-obvious reason), not the story of how it got that way.

## When a Comment Is Justified

Only for something the code cannot say itself:
- A hidden constraint or external requirement (e.g., a protocol quirk, a platform limitation)
- A subtle invariant the reader could otherwise break by "simplifying"
- A workaround, stated in general terms (what breaks and why), not as a changelog entry
- Behavior that would genuinely surprise a careful reader

## What Never Belongs in a Comment

- **References to the current task, ticket, bug ID, or "just fixed"** — that belongs in the commit message, not the code. A comment describing the fix for an error introduced moments ago is a diary entry, not documentation, and it rots the moment the surrounding code changes again.
- **What the code already says** — if removing the comment loses no information, delete it.
- **Narration of a specific decision's private context** ("we chose X because the other team asked", "temporary until Y ships") — write the general constraint instead, or put case-specific context in the commit message / PR description.
- **Multi-paragraph explanations** — a sign the design needs fixing: extract the invariant into a named function or type instead of writing a wall of prose around it.

```cpp
// Wrong — narrates a private fix history, will rot, belongs in commit message
// Fixed crash reported in issue #482: connection was null after close.
if (connection == nullptr) return;

// Correct — general, timeless fact about the code
// Upstream API returns null once the connection is closed.
if (connection == nullptr) return;
```

## Red Flags — delete the comment

- "This might help the next reader" — not enough; the bar is they get it *wrong* without it.
- "This expression is non-obvious, I'll explain it" — if it needs prose, name it (extract a constant or function) instead.
- "I'll note why I chose this approach" — that is commit-message material, not a code comment.

## Cross-References

- `commit-rules` — where task/fix/ticket context actually belongs
