import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  BookOpen, 
  Upload, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Sparkles,
  X,
  Plus
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface OnboardingDashboardProps {
  userName: string;
}

export const OnboardingDashboard = ({ userName }: OnboardingDashboardProps) => {
  const { user, refreshExamContext } = useAuth();
  const navigate = useNavigate();

  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState<Date>();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [dailyHours, setDailyHours] = useState("4");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [completedSteps, setCompletedSteps] = useState({
    exam: false,
    subjects: false,
    availability: false,
  });

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()]);
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  const handleSubmit = async () => {
    if (!examName.trim() || !examDate || subjects.length === 0) {
      toast.error("Please complete at least the exam context and subjects");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("exam_contexts").insert({
        user_id: user.id,
        exam_name: examName.trim(),
        exam_date: format(examDate, "yyyy-MM-dd"),
        subjects: subjects,
        daily_study_hours: parseInt(dailyHours) || 4,
      });

      if (error) throw error;

      await refreshExamContext();
      toast.success("Setup complete! Let's start optimizing your study plan.");
    } catch (error: any) {
      toast.error(error.message || "Failed to save setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isExamValid = examName.trim() && examDate;
  const isSubjectsValid = subjects.length > 0;
  const canSubmit = isExamValid && isSubjectsValid;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-soft text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          Welcome to JUMBLE
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Welcome, {userName}!
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Let's set up your study profile so JUMBLE can create intelligent, personalized recommendations for you.
        </p>
      </div>

      {/* Setup Cards */}
      <div className="space-y-6">
        {/* Step 1: Exam Context */}
        <div className={cn(
          "card-elevated p-6 border-2 transition-all",
          isExamValid ? "border-primary/20" : "border-transparent"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              isExamValid ? "bg-primary/10" : "bg-secondary"
            )}>
              {isExamValid ? (
                <CheckCircle className="w-6 h-6 text-primary" />
              ) : (
                <CalendarIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Set Exam Context</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent font-medium">Required</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Tell us about your upcoming exam
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="examName">Exam Name</Label>
                  <Input
                    id="examName"
                    placeholder="e.g., JEE Main, NEET, Board Exams"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exam Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !examDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {examDate ? format(examDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={examDate}
                        onSelect={setExamDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Subjects */}
        <div className={cn(
          "card-elevated p-6 border-2 transition-all",
          isSubjectsValid ? "border-primary/20" : "border-transparent"
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
              isSubjectsValid ? "bg-primary/10" : "bg-secondary"
            )}>
              {isSubjectsValid ? (
                <CheckCircle className="w-6 h-6 text-primary" />
              ) : (
                <BookOpen className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Confirm Subjects</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent font-medium">Required</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Add the subjects you need to prepare
              </p>

              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a subject (e.g., Physics)"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()}
                />
                <Button onClick={addSubject} size="icon" variant="secondary">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject) => (
                    <div
                      key={subject}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary text-sm"
                    >
                      {subject}
                      <button
                        onClick={() => removeSubject(subject)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Study Availability (Optional) */}
        <div className="card-elevated p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Study Availability</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Optional</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                How many hours can you study daily?
              </p>

              <div className="max-w-xs">
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="16"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">hours per day</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Upload PYQs (Optional - Coming Soon) */}
        <div className="card-elevated p-6 opacity-60">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-foreground">Upload PYQs</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload previous year question papers for enhanced analysis
              </p>
            </div>
          </div>
        </div>

        {/* Supportive copy */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground italic">
            You can update these settings anytime — JUMBLE adapts as you go.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            size="lg"
            className="px-8"
          >
            {isSubmitting ? "Setting up..." : "Start My Study Plan"}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
