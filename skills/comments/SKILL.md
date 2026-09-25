---
name: comments
version: "1.0.0"
description: Apply when writing or reviewing a comment in any language, in source code, a markup file, a build file or a configuration file, a documentation block on a public interface aside
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - universal
  rubric: applied
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

Apply when writing or reviewing a comment in any language, in source code, a markup file,
a build file or a configuration file, a documentation block on a public interface aside,
whatever marker opens it: `//`, `/* */`, `#`, `--`, `;`, `%`, `<!-- -->`.

- A documentation block on a public interface → the API-documentation skill of the
  language being written.
- Naming, types and the rest of the implementation conventions → the coding-conventions
  skill of the language being written.

## The Comments a Change Writes

**Must**

Must hold each comment a change writes or changes to the sections below, each at the
force of its own marker, and must not edit a file for a comment the change leaves as it
stands. Line comments on lines of their own are one comment until a line of code stands
between them, a blank line splitting none; a comment ending a line of code is one by
itself.

## Two Kinds of Comment

**Must**

Must admit no comment but the two kinds below, and must delete every comment this section
does not admit, commented-out code and a section banner that is no service comment
included.

| Kind | The comment | Identified by |
|---|---|---|
| service comment | one whose content a tool — a formatter, an analyser, a compiler, an editor — acts on as an instruction or an input | the tool acting on it |
| clarifying comment | one without which the meaning of the code beside it is not clear | the deletion test and the checkable claim |

A comment a tool only lists or highlights, such as a `TODO` comment an editor collects, is
no service comment.

Must admit a comment that is no service comment only where it passes both tests below:

| Test | The comment passes where |
|---|---|
| deletion test | with the comment deleted, the code beside it conveys a different meaning: what a line does, or why the line is there |
| checkable claim | it carries a function name, a condition or an ordering checkable against the code beside it |

The deletion test never compares why a value is the one it is.

Admitted, a service comment mypy acts on:

```python
from vendor_sdk import Client  # type: ignore[import-untyped]
```

Admitted, both tests passed; the ordering is the first write after `reset`:

```c
reset(port);
// The driver drops the first write after a reset.
write(port, header, size);
write(port, header, size);
```

Rejected by the deletion test, since the condition already conveys what the line does and
why it is there:

```cpp
// Upstream API returns null once the connection is closed.
if (connection == nullptr) return;
```

Rejected by the checkable claim alone; the deletion test keeps it, since nothing else says
why the line is there:

```ts
// Keeps the chart from flickering.
chart.update({ animate: false });
```

## A Comment a Name or a Type Replaces

**Must**

Must make the change a row below names in place of the comment that row describes, and
must admit no such comment beside that change.

| The comment | The change in its place |
|---|---|
| names a step | an extracted function of that name |
| says what a condition tests | a named predicate |
| says what a literal stands for | a named constant or enumeration |
| says what a variable or a parameter holds | a name that says it |
| names the units or the admitted values | a type that carries them |
| labels a block inside a function | a separate function |
| restates the line below it | none beyond deleting the comment |

Nothing else belongs to the list; a comment no row describes is not one a name or a type
replaces.

Before, rejected by the rows for a condition and for a step:

```cpp
// Sweep complete with measured points.
if (_state == 3 && _points > 0) {
    // Convert raw samples to dB.
    for (auto& sample : _samples) sample = 20 * std::log10(sample);
}
```

After:

```cpp
if (sweepIsComplete() && hasMeasuredPoints()) {
    convertToDecibels(_samples);
}
```

Before, rejected by the rows for a variable and for units:

```rust
struct Probe {
    ready: bool,     // true once init() returned
    threshold: f64,  // in degrees Celsius
}
```

After:

```rust
struct Probe {
    init_returned: bool,
    threshold: Temperature,
}
```

## What a Comment Leaves Out

**Must**

Must omit what the table below names from every comment:

| Left out | What it covers |
|---|---|
| case history of the code beside the comment | how the code came to be, what changed in it and when, the task, ticket or defect behind the change, the options weighed |
| a pending event or plan | what the code waits for, and what is to change in it and when |

On the driver workaround of Two Kinds of Comment:

| Comment | Verdict |
|---|---|
| `// The driver drops the first write after a reset.` | admitted |
| `// Second write added after the bench tests of the previous release.` | rejected: case history |

Rejected, a plan:

```python
# Temporary until the reporting service ships its own export.
return legacy_export(rows)
```

## One Fact per Comment

**Must**

Must put no two facts in one comment.

## Length

**Should**

Should give an admitted comment no more lines than the table below gives it. Zero lines,
the default, follows from Two Kinds of Comment.

| Lines | The admitted comment |
|---|---|
| 1 | any |
| more than 1 | one carrying one fact that does not fit in one line |

A line is as wide as the project sets; where it sets no width, an admitted comment carrying
one fact takes any number of lines.

## A Request for Comments

**Must**

Must write no comment the other sections of this skill reject, a request for comments
included; where that leaves the code with no comment, must say so in the reply's text
only, never in the code.
