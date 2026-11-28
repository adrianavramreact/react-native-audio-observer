# Contributing

Contributions are welcome, small or large.

## Setup

Use the Node.js version in [`.nvmrc`](./.nvmrc) and Yarn (not npm). For Android, use JDK 17.

```sh
yarn
```

## Example app

The [example app](/example/) uses the local library. JavaScript changes show up right away; native changes need a rebuild.

```sh
yarn example start
yarn example android
yarn example ios
```

To edit native code, open `example/ios/AudioObserverExample.xcworkspace` in Xcode (`Pods > Development Pods > AudioObserver`) or `example/android` in Android Studio (`react-native-audio-observer`). The example app links the library from this repo, so you are editing `ios/` and `android/` directly.
## Checks

```sh
yarn typecheck
yarn lint
yarn test
yarn test:android
yarn test:ios    # needs the example pods installed
```

CI runs all of them. Add tests for your change when you can. Tests follow DAMP, not DRY: write expected values as literals (`title: 'isInCall'`), not app constants, so each test reads on its own. See [Tests Too DRY? Make Them DAMP!](https://testing.googleblog.com/2019/12/testing-on-toilet-tests-too-dry-make.html).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en) (`fix`, `feat`, `refactor`, `docs`, `test`, `chore`). A pre-commit hook checks the format.

## Pull requests

- Keep each pull request to one change.
- Make sure the checks pass.
- Update the docs if behavior changes.
- For API or implementation changes, open an issue first.
