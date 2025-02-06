## Project info

# NPCChain UI
A front-end application that lets users chat with on-chain NPCs (Non-Player Characters) whose personas evolve over time. This UI integrates with:

A blockchain smart contract that stores references (IPFS CIDs) for each message and persona state.
An off-chain AI agent that processes messages and updates the NPC’s persona in a verifiable, tamper-evident manner.
Features
Persona Selection

View a list of available NPCs (e.g., “Batman”) and see their current persona summary.
Chat Interface

Send messages to an NPC.
Display the AI’s responses once finalized by the off-chain agent.
Blockchain Integration

Connect a web3 wallet to submit messages on-chain (storing IPFS CIDs).
Automatically listen for finalization events or poll the smart contract to fetch the AI’s response.
IPFS Integration

Messages are uploaded to IPFS before the transaction, ensuring decentralized storage.
The UI can retrieve conversation history and persona data from IPFS via CIDs recorded on-chain.
