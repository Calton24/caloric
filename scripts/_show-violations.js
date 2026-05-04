// Print violation locations from /tmp/eslint-i18n.json
const j = JSON.parse(require("fs").readFileSync("/tmp/eslint-i18n.json", "utf8"));
const filter = process.argv.slice(2);
j.filter((f) => f.messages.some((m) => m.ruleId === "i18n/no-hardcoded-strings"))
  .forEach((f) => {
    const p = f.filePath.replace(process.cwd() + "/", "");
    if (filter.length && !filter.some((pat) => p.includes(pat))) return;
    f.messages
      .filter((m) => m.ruleId === "i18n/no-hardcoded-strings")
      .forEach((m) => {
        console.log(`${p}:${m.line}: ${m.message.slice(0, 90)}`);
      });
  });
