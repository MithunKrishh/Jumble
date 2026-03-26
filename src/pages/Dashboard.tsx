import { AuthenticatedNavbar } from "@/components/AuthenticatedNavbar";
import { useAuth } from "@/contexts/AuthContext";
import { OnboardingDashboard } from "@/components/dashboard/OnboardingDashboard";
import { ActiveDashboard } from "@/components/dashboard/ActiveDashboard";

const Dashboard = () => {
  const { profile, examContext, hasCompletedSetup } = useAuth();

  const userName = profile?.full_name?.split(" ")[0] || "Student";

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedNavbar />
      
      {hasCompletedSetup && examContext ? (
        <ActiveDashboard 
          userName={userName}
          examName={examContext.exam_name}
          examDate={examContext.exam_date}
          subjects={examContext.subjects}
        />
      ) : (
        <OnboardingDashboard userName={userName} />
      )}
    </div>
  );
};

export default Dashboard;
