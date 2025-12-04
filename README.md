# Getting Started

This is an FGPE Learning Platform user interface. This project uses react, typescript, keycloak (auth), react-i18next, Apollo GraphQL (check available scripts below) and emotion / chakra-ui (styling).

You need Node.js installed to run this project.
This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Adding translations

This app is using the react-i18next package for internationalization.
You can check its documentation [here](https://react.i18next.com/).

To add new translations, create a new file: `public/locales/<language_code>/translation.json`, and then add a new language object inside `public/locales/supported-languages.json` file.

The `language` parameter should be in original language, not translated to English. The `code` parameter should be same as the name of the folder inside locales catalog, for instance for German language:

`public/locales/supported-languages.json`

```
[
    {
        code: "en",
        language: "English"
    },
    {
        code: "de",
        language: "Deutsch"
    }
]
```

Translations file:

```
public/locales/de/translation.json
```

You can add translations to the built version of the app (the `locales` folder is present in the built version), you don't have to run the build process to add new translations (but if you do so - it will work as well).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

### `npm run apollo:generate`

Generates typescript .ts files with the necessary types to the `src/generated/` folder (based on queries, mutations, and subscriptions used in the app).

You can change the host from which the graphql schema is downloaded from by simply changing the `--endpoint` flag.

### Compiles and minifies for production with Docker

```
docker build -t fgpe/learning-platform:latest .
```

### Serves for production with Docker

```
docker run -itd -p 8088:80 \
    -v $(pwd)/docker/nginx.conf:/etc/nginx/nginx.conf \
    --rm fgpe/learning-platform:pwa
```

## Acknowledgments

<table cellspacing="0" cellpadding="0" border=0>
<tr border=0>
<td border=0>

This software has been developed as a part of Framework for Gamified Programming Education (https://fgpe.usz.edu.pl/), FGPE Plus: Learning tools interoperability for gamified programming education (https://fgpeplus.usz.edu.pl/) and FGPE++ Gamified Programming Learning at Scale (https://fgpeplus2.usz.edu.pl/) projects which were co-funded by the European Union.
</td>
<td border=0>

![Framework for Gamified Programming Education project](https://raw.githubusercontent.com/FGPE-Erasmus/fgpe-ple-v2/master/docs/logo_FGPE.jpeg) ![Erasmus+](https://raw.githubusercontent.com/FGPE-Erasmus/lightweight-fgpe-server/master/logo_erasmus.jpg)
</td>
</tr>
</table>

## License

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
