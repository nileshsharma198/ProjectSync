import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

//innngest funtion to save user data to a data base
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        // email: data.email_address[0]?.email_address || null,
        email: data.email_addresses?.[0]?.email_address || null,
        name: data.first_name + " " + data.last_name,
        image: data?.image_url,
      },
    });
  }
);

//innngest funtion to Delete user data to a data base
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

//innngest funtion to Update user data to a data base
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        id: data.id,
        // email: data?.email_address[0]?.email_address,
        email: data.email_addresses?.[0]?.email_address || null,
        name: data.first_name + " " + data.last_name,
        image: data?.image_url,
      },
    });
  }
);

//Inngest function to save workspace data to database
const syncWorkspaceCreation = inngest.createFunction(
  { id: "sync-workspace-from-clerk" },
  { event: "clerk/organization.created" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });

    //add creator as Admin in workspace members
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

//Inngest function to update workspace data to database
const syncWorkspaceUpdation = inngest.createFunction(
  { id: "update-workspace-from-clerk" },
  { event: "clerk/organization.updated" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image_url: data.image_url,
      },
    });
  }
);

//Inngest function to delete workspace data from database
const syncWorkspaceDeletion = inngest.createFunction(
  { id: "delete-workspace-from-clerk" },
  { event: "clerk/organization.deleted" },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);


// Inngest function to save workspace member data to database
const syncWorkspaceMemberCreation = inngest.createFunction(
  { id: "sync-workspace-member-from-clerk" },
  { event: "clerk/organizationMembership.created" },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,                           // ✔ Correct user ID field
        workspaceId: data.organization.id,              // ✔ Correct workspace ID
        role: data.role === "org:admin" ? "ADMIN" : "MEMBER", // ✔ Convert Clerk role → Prisma enum
      },
    });
  }
);



//Inngest function to Send Email on task creation
const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-email" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true },
    });

    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: `
  <html>
  <body style="background:#0d0d0d; color:#e5e7eb; font-family:Arial; padding:0; margin:0;">

    <div style="max-width:600px;margin:20px auto;background:#1a1a1a;border-radius:10px;overflow:hidden;box-shadow:0 0 25px rgba(0,102,255,0.4);">

      <div style="padding:30px 20px;text-align:center;background:#0d0d0d;">
        <img src="${origin}/assets/ProjectSync.png" width="130" style="filter:drop-shadow(0 0 12px #3b82f6);" />
      </div>

      <div style="padding:25px 30px;">
        <p>Hiii <strong>${task.assignee.name}</strong>,</p>
        <p>You’ve been assigned a new task. Here are the details:</p>

        <div style="background:#111827;border-left:4px solid #3b82f6;padding:15px;border-radius:6px;margin:20px 0;">
          <p><strong style="color:#3b82f6;">Task Title:</strong> ${
            task.title
          }</p>
          <p><strong style="color:#3b82f6;">Description:</strong> ${
            task.description
          }</p>
          <p><strong style="color:#3b82f6;">Due Date:</strong> ${new Date(
            task.due_date
          ).toLocaleDateString()}</p>
        </div>

        <a href="${origin}/tasks/${task.id}"
           style="display:inline-block;background:#3b82f6;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;box-shadow:0 0 12px rgba(59,130,246,0.7);">
           View Task
        </a>

        <p style="margin-top:25px;">Please make sure to review and complete it before the due date.</p>
      </div>

      <div style="padding:20px;text-align:center;color:#6b7280;font-size:13px;">
        © ${new Date().getFullYear()} ProjectSync
      </div>
    </div>

  </body>
  </html>
  `,
    });

    if (
      new Date(task.due_date).toLocaleDateString() !==
      new Date().toLocaleDateString()
    ) {
      await step.sleepUntil("wait-for-the-due-date", new Date(task.due_date));

      await step.run("check-if-task-is-completed", async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true },
        });

        if (!task) return;

        if (task.status !== "COMPLETED") {
          await step.run("send-task-reminder-email", async () => {
            await sendEmail({
              to: task.assignee.email,
              subject: `Task Reminder in ${task.project.name}`,
              body: `
  <html>
  <body style="background:#0d0d0d; color:#e5e7eb; font-family:Arial; padding:0; margin:0;">

    <div style="max-width:600px;margin:20px auto;background:#1a1a1a;border-radius:10px;overflow:hidden;box-shadow:0 0 25px rgba(0,102,255,0.4);">

      <div style="padding:30px 20px;text-align:center;background:#0d0d0d;">
        <img src="${origin}/assets/ProjectSync.png" width="130" style="filter:drop-shadow(0 0 12px #3b82f6);" />
      </div>

      <div style="padding:25px 30px;">
        <p>Hiii <strong>${task.assignee.name}</strong>,</p>

        <p>This is a reminder about your pending task:</p>

        <div style="background:#111827;border-left:4px solid #3b82f6;padding:15px;border-radius:6px;margin:20px 0;">
          <p><strong style="color:#3b82f6;">Task Title:</strong> ${
            task.title
          }</p>
          <p><strong style="color:#3b82f6;">Description:</strong> ${
            task.description
          }</p>
          <p><strong style="color:#3b82f6;">Due Date:</strong> ${new Date(
            task.due_date
          ).toLocaleDateString()}</p>
        </div>

        <a href="${origin}/tasks/${task.id}"
           style="display:inline-block;background:#3b82f6;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;box-shadow:0 0 12px rgba(59,130,246,0.7);">
           View Task
        </a>

        <p style="margin-top:25px;">
          Please make sure to review and complete it before the due date.
        </p>

        <p style="margin-top:10px;">
          Staying on top of tasks helps keep your project running smoothly.Please review it as soon as possible.
        </p>
      </div>

      <div style="padding:20px;text-align:center;color:#6b7280;font-size:13px;">
        © ${new Date().getFullYear()} ProjectSync
      </div>
    </div>

  </body>
  </html>
  `,
            });
          });
        }
      });
    }
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
  sendTaskAssignmentEmail
];
