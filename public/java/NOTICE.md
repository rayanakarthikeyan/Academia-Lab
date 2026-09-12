# Java lab compiler: third-party notices

This portal bundles and runs a real Java 8 compiler and JVM in the browser.
The browser execution service has no daily quota, subscriptions, or API keys.
Hosting bandwidth and browser CPU/memory remain finite.

## Components and source

- **DoppioJVM and native adapters** — MIT. Copyright John Vilk, CJ Carey,
  Jez Ng, Jonny Leahey and contributors. [Source](https://github.com/plasma-umass/doppio).
  See `licenses/Doppio-MIT.txt`.
- **BrowserFS and its bundled dependencies** — MIT and the third-party notices
  reproduced in `licenses/BrowserFS-MIT.txt`.
  [Source](https://github.com/jvilk/BrowserFS).
- **Eclipse Compiler for Java 4.5** — Eclipse Public License 1.0.
  See `licenses/ECJ-about.html` and `licenses/ECJ-EPL-1.0.html`.
  [Compiler source, R4_5](https://github.com/eclipse-jdt/eclipse.jdt.core/tree/R4_5).
- **OpenJDK Java 8 class libraries** — GPL version 2 with the Classpath Exception,
  plus the included assembly exception and third-party notices. See
  `licenses/OpenJDK-GPLv2-Classpath.txt`, `licenses/OpenJDK-ASSEMBLY_EXCEPTION.txt`
  and `licenses/OpenJDK-THIRD_PARTY_README.txt`.
  The Java Home distribution identifies itself as Doppio JCL v3.2.
  [Distribution and source build recipes](https://github.com/plasma-umass/doppio_jcl)
  ([v3.2](https://github.com/plasma-umass/doppio_jcl/tree/v3.2));
  [OpenJDK 8 source](https://github.com/openjdk/jdk8u);
  [Ubuntu OpenJDK source packages](https://launchpad.net/ubuntu/+source/openjdk-8).
  Doppio's additional JCL classes are MIT, reproduced in `licenses/Doppio-JCL-MIT.txt`.

Bundled binaries came from the public Doppio demonstration distribution:
https://github.com/plasma-umass/doppio-demo/tree/898e6e5f59f2b30346831f6a735a4d7b1e08ef06

`asset-sources.json` records original download hashes and source paths.
`scripts/prepare-java-assets.py` reconstructs the packaged binaries and verifies
the input hashes. The original OpenJDK classes and ECJ compiler are unmodified.

## Local modifications

The runtime ZIP omits unused `lib/tools.jar` and `lib/ext/nashorn.jar`.
`vendor/java_home/jdk.json` removes tools.jar from the bootstrap classpath.
The `natives/doppio.js` JavaScript bridge now throws SecurityException instead
of evaluating JavaScript. This modification is reproducible in the packaging
script. All other retained runtime files are copied unchanged.

In `doppio.js`, a SyntaxError when generating an optimized basic block returns
null, selecting Doppio's existing bytecode-interpreter fallback. This prevents
an optimizer code-generation bug from aborting otherwise valid Java programs.

`runner-worker.js` compiles student source with ECJ, supplies a temporary stdin
file through a small Java launcher, and runs the result. `runner-frame.html`
provides an opaque-origin iframe and blocks network access. These wrappers are
part of this portal, not upstream Doppio or Eclipse.

The older Java runtime is intended for the documented, isolated teaching labs.
Do not use it as a production Java server or remove the sandbox restrictions.
The licenses above apply to their respective components, not to student code.
