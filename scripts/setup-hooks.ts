// Run once per clone. Git for Windows also supplies the hook's shell.
try {
  const result = await new Deno.Command("git", {
    args: ["config", "--local", "core.hooksPath", ".githooks"],
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  if (!result.success) {
    console.error("Run deno task setup inside your cloned project folder.");
    Deno.exit(result.code);
  }
} catch (error) {
  console.error("Could not run Git:", error);
  console.error("Install Git, restart your terminal, and try again.");
  Deno.exit(1);
}
console.log("Git hooks configured. Each commit will run deno task ci.");
