
import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSelector } from "react-redux";
import { useOrganization } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import api from "../configs/api.js";
import { useAuth } from "@clerk/clerk-react";


const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
  const { organization } = useOrganization();

  const { getToken } = useAuth();
  const currentWorkspace = useSelector(
    (state) => state.workspace.currentWorkspace
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "ADMIN",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1️⃣ Send invitation via Clerk
      await organization.inviteMember({
        emailAddress: formData.email,
        role: formData.role === "ADMIN" ? "org:admin" : "org:member",
      });

      // 2️⃣ Add to Prisma workspace
      await api.post(
        "/api/workspaces/add-member",
        {
          email: formData.email,
          role: formData.role,
          workspaceId: currentWorkspace.id,
          message: "",
        },
        {
          headers: {
            Authorization: `Bearer ${await getToken()}`,
          },
        }
      );

      toast.success("Member invited & added successfully");
      setIsDialogOpen(false);
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <UserPlus className="size-5" /> Invite Team Member
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* EMAIL */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="pl-10 w-full border rounded py-2"
              />
            </div>
          </div>

          {/* ROLE */}
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              className="w-full border rounded py-2"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberDialog;
