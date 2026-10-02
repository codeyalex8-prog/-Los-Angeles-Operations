const fs = require("fs");
const path = require("path");
const discordTranscripts = require("discord-html-transcripts");

const TICKET_LOG_CHANNEL_ID = "1555604116804468746";

const COUNTER_FILE = path.join(
    __dirname,
    "ticket-counter.json"
);

// ======================================================
// TICKET NUMBER
// ======================================================

function getNextTicketNumber() {

    let number = 1;

    try {

        if (fs.existsSync(COUNTER_FILE)) {

            const data = JSON.parse(
                fs.readFileSync(
                    COUNTER_FILE,
                    "utf8"
                )
            );

            if (
                typeof data.number === "number" &&
                data.number >= 1
            ) {
                number = data.number;
            }
        }

    } catch (error) {

        console.error(
            "[TICKET COUNTER READ ERROR]",
            error
        );

    }

    try {

        fs.writeFileSync(
            COUNTER_FILE,
            JSON.stringify({
                number: number + 1
            }, null, 4)
        );

    } catch (error) {

        console.error(
            "[TICKET COUNTER WRITE ERROR]",
            error
        );

    }

    return number;
}

// ======================================================
// GET TOPIC INFORMATION
// ======================================================

function getTopicValue(topic, key) {

    if (!topic) return "Unknown";

    const match = topic.match(
        new RegExp(`${key}:([^|]+)`)
    );

    if (!match) return "Unknown";

    try {
        return decodeURIComponent(match[1]);
    } catch {
        return match[1];
    }
}

// ======================================================
// LOG TICKET
// ======================================================

async function logTicket(channel, closedBy) {

    try {

        const ticketNumber =
            getNextTicketNumber();

        const openerId =
            getTopicValue(
                channel.topic,
                "ticket-owner"
            );

        const ticketType =
            getTopicValue(
                channel.topic,
                "ticket-type"
            );

        const reason =
            getTopicValue(
                channel.topic,
                "ticket-reason"
            );

        const claimedId =
            getTopicValue(
                channel.topic,
                "ticket-claimed"
            );

        // ==================================================
        // CREATE TRANSCRIPT
        // ==================================================

        const transcript =
            await discordTranscripts.createTranscript(
                channel,
                {
                    limit: -1,

                    filename:
                        `ticket-${ticketNumber}.html`,

                    saveImages: true,

                    poweredBy:
                        false
                }
            );

        // ==================================================
        // LOG CHANNEL
        // ==================================================

        const logChannel =
            await channel.client.channels.fetch(
                TICKET_LOG_CHANNEL_ID
            ).catch(() => null);

        if (!logChannel) {

            console.error(
                "[TICKET LOG ERROR] Log channel not found."
            );

            return;
        }

        // ==================================================
        // SEND TRANSCRIPT FIRST
        // ==================================================

        const transcriptMessage =
            await logChannel.send({

                files: [
                    transcript
                ]

            }).catch(error => {

                console.error(
                    "[TRANSCRIPT UPLOAD ERROR]",
                    error
                );

                return null;
            });

        if (!transcriptMessage) {
            return;
        }

        // ==================================================
        // FIND TRANSCRIPT URL
        // ==================================================

        const transcriptAttachment =
            transcriptMessage.attachments.first();

        const transcriptUrl =
            transcriptAttachment
                ? transcriptAttachment.url
                : null;

        // ==================================================
        // PANEL
        // ==================================================

        const safeReason =
            reason === "Unknown"
                ? "No reason provided."
                : reason;

        const opener =
            openerId !== "Unknown"
                ? `<@${openerId}>`
                : "Unknown";

        const claimer =
            claimedId !== "Unknown"
                ? `<@${claimedId}>`
                : "Unclaimed";

        const closer =
            closedBy
                ? `${closedBy}`
                : "Unknown";

        const components = [

            {
                type: 17,

                components: [

                    {
                        type: 12,

                        items: [

                            {
                                media: {

                                    url:
                                        "https://discord-webhook.com/uploads/bebfa3fc5a4226a9a3ebf746a42da75b.png"

                                }
                            }

                        ]
                    },

                    {
                        type: 14,
                        spacing: 2,
                        divider: true
                    },

                    {
                        type: 10,

                        content:
`### Ticket Logged ${ticketNumber}

> **Opened By:** ${opener}
> **Ticket Type:** ${ticketType}
> **Reason:** ${safeReason}
> **Claimed By:** ${claimer}
> **Closed By:** ${closer}`

                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 1,

                        components: [

                            {
                                type: 2,
                                style: 5,
                                label: "View Transcript",
                                url:
                                    transcriptUrl ||
                                    "https://discord.com"
                            }

                        ]

                    },

                    {
                        type: 14,
                        spacing: 1,
                        divider: true
                    },

                    {
                        type: 12,

                        items: [

                            {
                                media: {

                                    url:
                                        "https://discord-webhook.com/uploads/8d3e65a56082c2425d8ed7a95190158f.png"

                                }
                            }

                        ]
                    }

                ]
            }

        ];

        // ==================================================
        // SEND LOG PANEL
        // ==================================================

        await logChannel.send({

            flags: 32768,

            components

        });

        console.log(
            `[TICKET LOGGED] Ticket #${ticketNumber} | ${channel.name}`
        );

    } catch (error) {

        console.error(
            "========== TICKET LOG ERROR =========="
        );

        console.error(error);

        console.error(
            "======================================"
        );

    }
}

module.exports = {
    logTicket
};