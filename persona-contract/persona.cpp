#include <persona.hpp>

void persona::initpersona(const string& initial_state_cid) 
{
    require_auth(get_self());
    
    personainfo_table info(get_self(), get_self().value);
    
    // Only allow one row with id=1
    check(info.find(1) == info.end(), "Persona info already exists");

    info.emplace(get_self(), [&](auto& row) {
        row.id = 1;
        row.initial_state_cid = initial_state_cid;
    });
}

void persona::submitmsg(name account_name,
                       const string& pre_state_cid,
                       const string& msg_cid,
                       const string& full_convo_history_cid)
{
    require_auth(account_name);

    check(!msg_cid.empty(), "Message CID cannot be empty");
    
    // Update or create conversation entry
    convos_table convos(get_self(), get_self().value);
    auto conv_itr = convos.find(account_name.value);

    if(conv_itr == convos.end()) {
        convos.emplace(get_self(), [&](auto& row) {
            row.account_name = account_name;
            row.full_convo_history_cid = full_convo_history_cid;
        });
    } else {
        convos.modify(conv_itr, get_self(), [&](auto& row) {
            row.full_convo_history_cid = full_convo_history_cid;
        });
    }

    // Add new message
    messages_table messages(get_self(), account_name.value);
    
    messages.emplace(get_self(), [&](auto& row) {
        row.key = messages.available_primary_key();
        row.pre_state_cid = pre_state_cid;
        row.msg_cid = msg_cid;
        row.post_state_cid = "";  // To be filled by finalizemsg
        row.response = "";    // To be filled by finalizemsg
    });
}

void persona::finalizemsg(name account_name,
                         uint64_t key,
                         const string& post_state_cid,
                         const string& response,
                         const string& full_convo_history_cid)
{
    require_auth(get_self());

    // Update message with AI response
    messages_table messages(get_self(), account_name.value);
    auto msg_itr = messages.find(key);
    check(msg_itr != messages.end(), "Message not found");

    messages.modify(msg_itr, get_self(), [&](auto& row) {
        row.post_state_cid = post_state_cid;
        row.response = response;
    });

    // Update conversation history
    convos_table convos(get_self(), get_self().value);
    auto conv_itr = convos.find(account_name.value);
    check(conv_itr != convos.end(), "Conversation not found");

    convos.modify(conv_itr, get_self(), [&](auto& row) {
        row.full_convo_history_cid = full_convo_history_cid;
    });
}