// Conservative name-to-category mapping. Only maps well-known tools with high confidence.
// Returns null for unknowns — caller falls back to "Outras" or asks the user.

const KNOWN: [string, string][] = [
    // Comunicação
    ['slack', 'Comunicação'],
    ['zoom', 'Comunicação'],
    ['microsoft teams', 'Comunicação'],
    ['google meet', 'Comunicação'],
    ['discord', 'Comunicação'],
    ['loom', 'Comunicação'],
    ['whereby', 'Comunicação'],
    ['webex', 'Comunicação'],
    ['telegram', 'Comunicação'],

    // Design
    ['figma', 'Design'],
    ['canva', 'Design'],
    ['adobe', 'Design'],
    ['sketch', 'Design'],
    ['invision', 'Design'],
    ['framer', 'Design'],
    ['zeplin', 'Design'],
    ['miro', 'Design'],
    ['lucidchart', 'Design'],

    // Produtividade
    ['notion', 'Produtividade'],
    ['asana', 'Produtividade'],
    ['monday', 'Produtividade'],
    ['trello', 'Produtividade'],
    ['clickup', 'Produtividade'],
    ['airtable', 'Produtividade'],
    ['basecamp', 'Produtividade'],
    ['todoist', 'Produtividade'],
    ['evernote', 'Produtividade'],

    // CRM
    ['salesforce', 'CRM'],
    ['hubspot', 'CRM'],
    ['pipedrive', 'CRM'],
    ['zoho crm', 'CRM'],
    ['rdstation', 'CRM'],
    ['freshsales', 'CRM'],

    // Desenvolvimento
    ['github', 'Desenvolvimento'],
    ['gitlab', 'Desenvolvimento'],
    ['jira', 'Desenvolvimento'],
    ['linear', 'Desenvolvimento'],
    ['confluence', 'Desenvolvimento'],
    ['bitbucket', 'Desenvolvimento'],
    ['vercel', 'Desenvolvimento'],
    ['netlify', 'Desenvolvimento'],
    ['heroku', 'Desenvolvimento'],
    ['aws', 'Desenvolvimento'],
    ['google cloud', 'Desenvolvimento'],
    ['azure', 'Desenvolvimento'],
    ['datadog', 'Desenvolvimento'],
    ['sentry', 'Desenvolvimento'],
    ['postman', 'Desenvolvimento'],

    // Analytics
    ['google analytics', 'Analytics'],
    ['mixpanel', 'Analytics'],
    ['amplitude', 'Analytics'],
    ['hotjar', 'Analytics'],
    ['segment', 'Analytics'],
    ['logrocket', 'Analytics'],
    ['heap', 'Analytics'],

    // Suporte
    ['zendesk', 'Suporte'],
    ['intercom', 'Suporte'],
    ['freshdesk', 'Suporte'],
    ['crisp', 'Suporte'],
    ['hubspot service', 'Suporte'],
    ['help scout', 'Suporte'],
    ['front', 'Suporte'],
]

export function guessCategory(name: string): string | null {
    const lower = name.toLowerCase().trim()
    for (const [key, category] of KNOWN) {
        if (lower.includes(key)) return category
    }
    return null
}
