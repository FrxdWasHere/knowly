import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, Printer } from "lucide-react";
import { AppPage } from "@/components/app-page";
import { PageHeader } from "@/components/app-shell";
import { CoursePaper } from "@/components/print/course-paper";
import { Button } from "@/components/ui/button";
import { decksForCourse } from "@/lib/courses";
import { useKnowly } from "@/store/knowly";

export const Route = createFileRoute("/_authenticated/courses/$courseId/print")({
  head: () => ({ meta: [{ title: "Print Course · Study Pack | Knowly" }] }),
  component: CoursePrintPage,
});

function CoursePrintPage() {
  const { courseId } = Route.useParams();
  const { state } = useKnowly();
  const course = state.courses.find((course) => course.id === courseId);

  if (!course) {
    return (
      <AppPage>
        <div className="panel mx-auto max-w-lg p-8 text-center">
          <BookOpenCheck className="mx-auto size-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-semibold">Course not found</h1>
          <Button asChild className="mt-5">
            <Link to="/courses">Back to courses</Link>
          </Button>
        </div>
      </AppPage>
    );
  }

  const linkedDecks = decksForCourse(course, state.decks);
  const progress = state.courseProgress[course.id];

  return (
    <AppPage>
      <div className="max-w-5xl">
        <div className="print-hide">
          <PageHeader
            title="Print course"
            description="A complete study pack: everything for this course, formatted as a clean printable pack with an answer key."
            action={
              <Button onClick={() => window.print()}>
                <Printer /> Print / Save as PDF
              </Button>
            }
          />
        </div>

        <CoursePaper course={course} progress={progress} decks={linkedDecks} />
      </div>
    </AppPage>
  );
}
