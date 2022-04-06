<!--
 Copyright © 2021 The Radicle Upstream Contributors

 This file is part of radicle-upstream, distributed under the GPLv3
 with Radicle Linking Exception. For full terms see the included
 LICENSE file.
-->
<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { clean, satisfies } from "semver";

  import * as ipc from "ui/src/ipc";
  import * as proxy from "ui/src/proxy";
  // import * as router from "ui/src/router";

  import { Step, DependencyCheckResult } from "ui/src/onboarding";

  import RadicleLogo from "design-system/RadicleLogo.svelte";
  import CheckItem from "./OnboardingModal/CheckItem.svelte";
  import CodeBlock from "./OnboardingModal/CodeBlock.svelte";

  let activeStep: Step = Step.installRadCli;
  let doneSteps: Step[] = [];

  let radCliVersion: string;
  let identityName: string;
  let gitVersion: string;

  const stepSequence: Step[] = [
    Step.installRadCli,
    Step.createRadIdentity,
    Step.addUpstreamCliToPath,
    Step.setUpGit,
  ];

  const markStepAsDone = (stepName: Step) => {
    doneSteps = [...doneSteps, stepName];

    while (doneSteps.includes(activeStep)) {
      // if (stepSequence.indexOf(activeStep) + 1 === stepSequence.length) {
      //   router.replace({ type: "profile" });
      // }

      activeStep = stepSequence[stepSequence.indexOf(activeStep) + 1];
    }
  };

  const check = async (forStep: Step): Promise<DependencyCheckResult> => {
    switch (forStep) {
      case Step.installRadCli: {
        const radCliCheck = await ipc.checkShellForCommand("rad");

        if (radCliCheck.exists) {
          const verString = clean(radCliCheck.version.replace("rad", ""));

          if (!verString) {
            return { step: forStep, passed: false };
          }

          radCliVersion = verString;

          return { step: forStep, passed: true, version: verString };
        }

        break;
      }
      case Step.addUpstreamCliToPath: {
        const upstreamCliCheck = await ipc.checkShellForCommand("upstream");

        if (upstreamCliCheck.exists) {
          return {
            step: forStep,
            passed: true,
            version: upstreamCliCheck.version,
          };
        }

        break;
      }
      case Step.createRadIdentity: {
        const proxySession = await proxy.client.sessionGet();

        if (proxySession.identity) {
          identityName = proxySession.identity.metadata.handle;

          return {
            step: Step.createRadIdentity,
            passed: true,
            name: proxySession.identity.metadata.handle,
          };
        }

        break;
      }
      case Step.setUpGit: {
        const gitCheck = await ipc.checkShellForCommand("git");

        if (gitCheck.exists) {
          const verString = clean(gitCheck.version.replace("git version", ""));

          if (!verString) {
            return { step: forStep, passed: false };
          }

          if (satisfies(verString, ">=2.35.1")) {
            gitVersion = verString;
            return { step: forStep, passed: true, version: verString };
          }
        }

        break;
      }
    }

    return { step: forStep, passed: false };
  };

  const performCheck = async (forStep: Step) => {
    const result = await check(forStep);

    if (result.passed) {
      markStepAsDone(forStep);
    }
  };

  let checkInterval: NodeJS.Timer;

  $: {
    clearInterval(checkInterval);

    checkInterval = setInterval(() => {
      performCheck(activeStep);
     }, 1000);
  }

  onDestroy(() => {
    clearInterval(checkInterval);
  });

  onMount(async () => {
    await performCheck(Step.installRadCli);
    await performCheck(Step.createRadIdentity);
    await performCheck(Step.addUpstreamCliToPath);
    await performCheck(Step.setUpGit);
  });
</script>

<style>
  .wrapper {
    width: 100vw;
  }
  .container {
    width: 100vw;
    padding: 128px;
    max-width: 1024px;
    margin: 0 auto;
  }

  .welcome-text {
    margin: 96px 0;
  }

  .welcome-text > h1 {
    margin-bottom: 16px;
  }

  h1,
  p {
    max-width: 544px;
  }

  p {
    color: var(--color-foreground-level-6);
  }

  .check-item-container {
    margin: 0 -16px;
  }

  .step-content > *:not(:last-child) {
    margin-bottom: 24px;
  }

  .step-content > *:not(:first-child) {
    margin-top: 24px;
  }
</style>

<div class="wrapper">
  <div class="container">
    <RadicleLogo />
    <div class="welcome-text">
      <h1>Welcome to Radicle</h1>
      <p>
        Radicle is a free and open-source way to host, share, and build software
        together. To get started, we just need to complete a few simple steps.
      </p>
    </div>
    <div class="check-item-container">
      <CheckItem
        expanded={activeStep === Step.installRadCli}
        title="Install the Radicle CLI"
        onSkip={() => markStepAsDone(Step.installRadCli)}
        done={doneSteps.includes(Step.installRadCli)}
        waitingFor="Radicle CLI to be installed"
        badge={radCliVersion && `Version ${radCliVersion} installed`}>
        <div class="step-content" slot="content">
          <p>
            First, let's install the Radicle CLI. You'll use the CLI to create
            and publish projects to the Radicle network, or clone existing ones
            to your machine.
          </p>
          <p>
            To get started, ensure you have <a
              class="typo-link"
              href="https://doc.rust-lang.org/cargo/getting-started/installation.html"
              >Cargo</a>
            and <a class="typo-link" href="https://cmake.org/install/">CMake</a>
            installed, then run:
          </p>
          <CodeBlock
            command="cargo install --force --locked --git https://seed.alt-clients.radicle.xyz/radicle-cli.git radicle-cli" />
          <p>On x86_64, you can alternatively install using Homebrew:</p>
          <CodeBlock
            command="brew tap radicle/cli https://seed.alt-clients.radicle.xyz/radicle-cli-homebrew.git && brew install radicle/cli/core" />
        </div>
      </CheckItem>
      <CheckItem
        done={doneSteps.includes(Step.createRadIdentity)}
        expanded={activeStep === Step.createRadIdentity}
        title="Create your Radicle identity"
        waitingFor="Radicle identity to be created"
        badge={identityName && `Hello, ${identityName} 👋`}>
        <div class="step-content" slot="content">
          <p>
            It"s time to create your unique Radicle identity. You’ll unlock
            Upstream and the CLI with your passphrase, and all your activity on
            the Radicle network will be signed with your Ed25519 keypair.
          </p>
          <CodeBlock command="rad auth">
            <span slot="output">
              Initializing your 🌱 profile and identity<br />
              <br />
              <span style="color: var(--color-positive)">ok</span> Username ·
              koops<br />
              <span style="color: var(--color-positive)">ok</span> Passphrase ·
              ********<br />
              <span style="color: var(--color-positive)">ok</span> Creating your
              🌱 Ed25519 keypair...<br />
              <span style="color: var(--color-positive)">ok</span> Adding to
              ssh-agent...<br />
              <span style="color: var(--color-positive)">ok</span> Profile
              3ae66df3-6ac7-4466-9013-83839749ed05 created.<br />
              <br />
              Your radicle Peer ID is
              <span style="color: var(--color-positive)"
                >hyncoz7x4s8x9447g6yogy4iy41q8i4juy5uhou57w1ga7obt644wo</span
              >. This identifies your device.<br />
              Your personal 🌱 URN is
              <span style="color: var(--color-positive)"
                >rad:git:hnrkmx6trm4bu19bwa4apbxj8ftw8f7amfdyy</span
              >. This identifies you across devices.<br />
              <br />
              <span style="color: var(--color-primary)"
                >=> To create a radicle project, run `rad init` from a git
                repository.</span
              ><br />
            </span>
          </CodeBlock>
        </div>
      </CheckItem>
      <CheckItem
        done={doneSteps.includes(Step.addUpstreamCliToPath)}
        expanded={activeStep === Step.addUpstreamCliToPath}
        onSkip={() => markStepAsDone(Step.addUpstreamCliToPath)}
        title="Add the Upstream CLI to PATH"
        waitingFor="the Upstream CLI to be installed">
        <div class="step-content" slot="content">
          <p>
            The Upstream CLI adds additional commands needed for code
            collaboration with upstream. Please ensure that the
            §HOME/.radicle/bin directory is added to your shell"s PATH.
          </p>
        </div>
      </CheckItem>
      <CheckItem
        done={doneSteps.includes(Step.setUpGit)}
        expanded={activeStep === Step.setUpGit}
        onSkip={() => markStepAsDone(Step.setUpGit)}
        title="Set up Git"
        badge={gitVersion && `Version ${gitVersion} installed`}>
        <div class="step-content" slot="content">
          <p>
            Radicle is built on Git. In order to collaborate with others, you'll
            need at least version 2.35.1 of Git installed.
          </p>
          <p>
            You can download the latest version on the <a
              href="https://git-scm.com/download/"
              class="typo-link">official website</a
            >.
          </p>
        </div>
      </CheckItem>
    </div>
  </div>
</div>
