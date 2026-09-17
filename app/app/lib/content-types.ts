export type Content = {
 appointments: {openingHours: Record<string,{open:number;close:number}>;guestOptions:string[];experiences:{name:string;price:number;start:number;end:number;days:number[]}[]};
 appConfig:{venue:string;location:string;menuNotification:{context:string;title:string;body:string};contact:{phone:string;email:string}};
 menu:{serviceMessages:Record<string,string>;menuServicePeriods:{id:string;label:string;start:string;end:string;categories:string[];days?:number[]}[];dietaryTagNames:Record<string,string>;dietaryTags:Record<string,string[]>;outOfStockItems:string[];menuItems:Record<string,{title:string;items:string[][]}[]>;categories:{label:string;source:string;service:string;sections?:number[]}[]};
 points:{points:number;nextRewardAt:number;tier:string;benefits:string;promotions:{doublePoints:{label:string;start:string;end:string;displayHours:string;displayDays:string;days:number[]}[]}};
 profile:{storageKey:string;default:{name:string;email:string;memberSince:string;tier:string;tastes:string[];dietaryNeeds:string[]};venue:{name:string;location:string};tasteOptions:string[];dietaryRequirementOptions:string[];allergenOptions:string[]};
 rewards:{rewards:{icon:string;title:string;meta:string;code:string}[]};
 events:{events:{date:string;day:string;number:string;month:string;title:string;description:string;notification:string;festive?:boolean}[]};
};
