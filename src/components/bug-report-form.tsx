import { useState, type FormEvent } from "react";
import { Bug, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const GITHUB_ISSUES_URL = "https://github.com/FrxdWasHere/knowly/issues/new";

export function BugReportForm() {
  const [open, setOpen] = useState(false);
  const [issueUrl, setIssueUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [error, setError] = useState("");

  const prepareReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const body = [
      "### What happened?",
      description.trim(),
      "### Steps to reproduce",
      steps.trim(),
      "### Expected behavior",
      expected.trim() || "Not provided",
      "### Actual behavior",
      actual.trim() || "Not provided",
    ].join("\n\n");
    const url = new URL(GITHUB_ISSUES_URL);
    url.searchParams.set("title", title.trim());
    url.searchParams.set("body", body);
    url.searchParams.set("labels", "bug");

    if (url.toString().length > 7000) {
      setError("This report is too long to prepare. Shorten the details and try again.");
      return;
    }

    setIssueUrl(url.toString());
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Bug />
        Report a bug
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Report a bug</DialogTitle>
            <DialogDescription>
              Reports are prepared for Knowly’s GitHub issue tracker. You’ll review and submit them
              there, and need a GitHub account. Don’t include passwords, private study content, or
              other sensitive information.
            </DialogDescription>
          </DialogHeader>

          {issueUrl ? (
            <div className="space-y-4">
              <p role="status" className="text-sm text-muted-foreground">
                Your report is ready. Continue to GitHub to review it and submit the issue.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <a href={issueUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Continue to GitHub
                  </a>
                </Button>
                <Button type="button" variant="outline" onClick={() => setIssueUrl("")}>
                  Edit report
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={prepareReport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bug-report-title">Short summary</Label>
                <Input
                  id="bug-report-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={140}
                  required
                  placeholder="What went wrong?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-report-description">What happened?</Label>
                <Textarea
                  id="bug-report-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={1500}
                  required
                  rows={3}
                  placeholder="Describe the problem."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-report-steps">Steps to reproduce</Label>
                <Textarea
                  id="bug-report-steps"
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  maxLength={1500}
                  required
                  rows={3}
                  placeholder="1. Go to… 2. Select… 3. See what happens."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-report-expected">What did you expect? (optional)</Label>
                <Textarea
                  id="bug-report-expected"
                  value={expected}
                  onChange={(event) => setExpected(event.target.value)}
                  maxLength={750}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bug-report-actual">What happened instead? (optional)</Label>
                <Textarea
                  id="bug-report-actual"
                  value={actual}
                  onChange={(event) => setActual(event.target.value)}
                  maxLength={750}
                  rows={2}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full">
                Prepare bug report
                <ExternalLink />
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
