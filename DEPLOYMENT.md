# Laboratory 3 publication and compilation integration

Repository: https://github.com/v-Exor/cedar

Website address (available after a successful Pages deployment):
https://v-exor.github.io/cedar/

Publishing source: GitHub Actions. The workflow at `.github/workflows/pages.yml`
checks the source and verifies numerical fixtures before publishing the static
website. Push changes to `main` to deploy future updates.

## Connect Website_LaboratoryAct_Compilation

Set the compilation website's Laboratory Activity 3 button/link destination to:

```text
https://v-exor.github.io/cedar/
```

For a plain HTML compilation page, use:

```html
<a href="https://v-exor.github.io/cedar/"
   target="_blank" rel="noopener noreferrer">
  Open Laboratory Activity 3
</a>
```

Once the compilation website's own public URL is known, set `compilationUrl` in
this project's `site-config.js` to it and push the change. The repository link
is already configured. Until then, the Back to Laboratory Compilation button
opens the working URL-configuration dialog; no compilation address is invented.

The publication includes all source, static assets, the bundled OpenCV runtime,
reference results, Python code and sample, downloadable kit, tests, documentation
and deployment configuration. Local installations, QA artifacts and generated
Python results are deliberately excluded from Git. The lab remains independently
navigable and does not depend on the compilation site.
