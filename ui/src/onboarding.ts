// Copyright © 2021 The Radicle Upstream Contributors
//
// This file is part of radicle-upstream, distributed under the GPLv3
// with Radicle Linking Exception. For full terms see the included
// LICENSE file.

export enum Step {
  installRadCli,
  createRadIdentity,
  addUpstreamCliToPath,
  setUpGit,
}

export type DependencyCheckResult =
  | {
      step: Step.createRadIdentity;
      passed: true;
      name: string;
    }
  | {
      step: Step;
      passed: boolean;
      version?: string;
    };
