import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "project-management" });

//innngest funtion to save user data to a data base
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({event}) =>{
        const {data} = event
        await prisma.user.create({
            data: {
                id: data.id,
                email: data.email_address[0]?.email_address || null,
                name: data.first_name + " " + data.last_name,
                image: data?.image_url
            }
        })
    }
)

//innngest funtion to Delete user data to a data base
const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-from-clerk'},
    {event: 'clerk/user.deleted'},
    async ({event}) =>{
        const {data} = event
        await prisma.user.delete({
            where: {
                id: data.id,
            }
        })
    }
)

//innngest funtion to Update user data to a data base
const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.updated'},
    async ({event}) =>{
        const {data} = event
        await prisma.user.update({
            where: {
                id: data.id
            },
            data: {
                id: data.id,
                email: data?.email_address[0]?.email_address,
                name: data.first_name + " " + data.last_name,
                image: data?.image_url
            }
        })
    }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [
    syncUserCreation,
    syncUserDeletion,
    syncUserUpdation
];