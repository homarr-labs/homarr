export interface ISearchableIntegration {
    searchAsync(query: string): Promise<{ image?: string, name: string, link: string }[]>;
}