#pragma once

#include <sysio/system.hpp>
#include <sysio/sysio.hpp>
#include <string>

using namespace sysio;
using std::string;

/**
 * Persona Contract
 *
 * This contract stores:
 * 1) A "convos" table tracking conversation history CIDs per user
 * 2) A "messages" table storing conversation steps with pre/post states
 * 3) An optional "personainfo" table for persona backstory
 */
CONTRACT persona : public contract {
public:
    using contract::contract;

    /**
     * Set the initial "backstory" or "initial state" for the persona
     */
    ACTION initpersona(const string& initial_state_cid);

    /**
     * Log a new message in the messages table and update conversation history
     */
    ACTION submitmsg(name account_name,
                    const string& pre_state_cid,
                    const string& msg_cid,
                    const string& full_convo_history_cid);

    /**
     * Store the AI's response and new state in the message row
     */
    ACTION finalizemsg(name account_name,
                      uint64_t key,
                      const string& post_state_cid,
                      const string& response,
                      const string& full_convo_history_cid);

private:
    TABLE convo_info {
        name        account_name;           
        string      full_convo_history_cid; 

        uint64_t primary_key() const { return account_name.value; }

        SYSLIB_SERIALIZE(convo_info, (account_name)(full_convo_history_cid))
    };

    TABLE message_info {
        uint64_t    key;         
        string      pre_state_cid;   
        string      msg_cid;     
        string      post_state_cid;  
        string      response;    

        uint64_t primary_key() const { return key; }

        SYSLIB_SERIALIZE(message_info, (key)(pre_state_cid)(msg_cid)(post_state_cid)(response))
    };

    TABLE persona_info {
        uint64_t    id;          // Always 1
        string      initial_state_cid; 

        uint64_t primary_key() const { return id; }

        SYSLIB_SERIALIZE(persona_info, (id)(initial_state_cid))
    };

    typedef multi_index<"convos"_n, convo_info> convos_table;
    typedef multi_index<"messages"_n, message_info> messages_table;
    typedef multi_index<"personainfo"_n, persona_info> personainfo_table;
};
