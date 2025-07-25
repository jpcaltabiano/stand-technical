# Stand Insurance - Takehome Technical
Written by Joseph Caltabiano


## Overview of selected stack

For this project, I used a Node.js-based stack with JavaScript to maximize my dev speed and leverage some great FE and BE tools.

I chose Node because it allows for rapid devlopment with JS for both FE and BE. It has minimal, non-blocking architechture and comes with the massive NPM library, allowing me to use a ton of useful tools for server/API, testing, JSON validation, etc. These libs speed up the development of common features, making it ideal for a small full-stack project like this. 

My backend was built with Express. Being widely adopted and quite minimal, it allowed for rapid prototyping and testing as well as very straightforward API design. It is not opinionated about patterns, so it provided the flexibility I needed to change them up as I developed. It is also a common standard for server development when using Node.

My frontend was build with React. I chose this because of its widespread nature and great patterns/feature sets. React is an industry standard when it comes to robust frontends, so it has lots of support, docs, and a huge dev community. Pragmatically, the design paradigms allow for powerful and resuable code. Modular components make the codebase eaiser to maintain and expand - for example I could use the same component to show the vulnerabilities/mitigations on both the underwriter and science user pages. React's state management makes it easy to manage complex UI states inside and between components, and makes extending the codebase easy when things change in the future. 

I opted for JS over TS to let me get code out faster without having to worry about overhead with strict typing. For a project of this size it was not necessary to enforce types.


## Architecture overview

I separated code into a frontend (root and src/) and backend (backend/). In each I have separate package.json files so that they can exist independently of one another and be deployed separately. Dependencies are isolated to where they need to be and version conflicts can be avoided and deployment remains flexibile.

In the backend dir, I handle all the logic about observations, rules, and vulnerabilites/mitigations. I chose to represent a rule as a JSON object, consisting of id/name/desc, a logic object, a vulnerability if the rule fails, and a list of the possible mitigations. 

The logic object allows for code evlauation of a rule against a JSON observation in a standardized and predictible way. We can write a logic node, such as NOT or OR, and then give other logic nodes or info inside. An example of how this works for the attic vent screen rule:

```
"logic": {
    "not": {
        "equals": [
        { "field": "Attic Vent has Screens" },
        "True"
        ]
    }
},
```
We can evaluate this out to - rule fails if the field `Attic Vent has Screens` is not true.

The structure of a rule is enforced with a JSON schema stored in rules.schema.json. This defines how a rule is written, and lets us validate new rules/updates to a rule before writing it to the database. 

The rules are stored in json files that are referenced by the server and act as our database. I am using one file per engine version. rules_v1.json is the default engine, and when a science user creates/updates/deletes a rule, a new file is created (ex rules_v2.json) with the changes. This lets us reference rules_v1.json as a snapshot of the engine - users can select different engine versions while doing their work.

I've also got some tests in test.js where I could test out the logic and API as I went, and catch when changes broke other logic unintentionally. 

For the API, the server exposes a host of endpoints written with Express. They let us get specific with what we want to do with rule management and testing, as well as utils like /human-readable and /engine-verions. /evaluate is what handles the evaluation of an observation against some or all rules.

The frontend is structured like a standard minimal React app. I initialized the project using nano-react-app to avoid generating uncessary files. Our root contains the index.html entry point and the package.json for the frontend. The src/ dir has our classic App.jsx/index.jsx pattern, and dir for the page components /pages/. I separated out EvaluationResults.jsx into a /components/ dir to set up the pattern of /pages/ holding page components and /components/ holding smaller reusable components. This will make expansion of the codebase cleaner. 

Each component is structured as a normal functional component. I use React Router in App.jsx to handle the routes for the underwriter page and the scientist page. A welcome component lets a user choose which page they want to use. I am keeping styles inline for the scope of this project, but would pull them out to centrally manage them for a larger app. 


## Functionality overview

This application lets underwriters get an understanding of the vulnerabilities a proprty has, and what can be done about it. Applied science users can manage the rules by creating, updating and deleting them.

### Underwriters:
The underwriter page contains three tools. Across all, we let the user select which timestamped engine version they want to work with.
1) Property evaluation - Here, an underwriter can enter an observation of a property. They can choose to fill out some or all of the fields, and can choose some or all of the rules to run on the property. The underwriter may also choose to include if a property has implemented some bridge mitigations already. After evaluating a property, we return all possible vulnerabilities. For some cases, if we are missing some fields, we show the user that there may be a potential vulnerability depending on the value of those missing fields. For all vulnerabilities, we show the full and bridge mitigations available. 
2) Vulnerability lookup - here a user can select a vulnerability from the list of all possible vulnerabilities, and see what the mitigation options are for each one.
3) Rule explorer - a user can select a rule from the list of all possible rules, and see the human-readable format. This includes the given description, the mitigations, and string that is generated by traversing the logic tree of a rule. For example, the logic string for the roof rule would be `Logic: NOT (field 'Roof Type' == Class A OR field 'Roof Type' == Class B AND field 'Wildfire Risk Category' == A)`

### Science users:
The applied science users can use a dashboard to write new rules, as well as update and delete rules from the engine. Every change to a rule will cause the engine version to tick up. I expose a text editor where the user can write or manipulate a rule's JSON, and a second editor where they can input an observation object to test the rule against. Users can select the engine version here as well. If they want to update or delete a rule, they select a rule and its JSON will be shown in the editor. If they want to create a new rule, a skeleton object with the necessary fields is shown instead. When saving changes, a modal will ask for confirmation and inform the user the action is permenant. 


## Future works and fixes

- I am currently just showing the underwriter how many bridge mitigations have been/would be done on a property. In future work I would add the infrastructure to define an upper limit on the number of bridge mitigations allowed, and communicate how close a property is to that limit.
- I would update logic about how bridge mitigations might change the evaluation of a rule. The window rule is an example - bridge mitigations applied will actually change the values in the rule evaluation. Adding the film will reduce the safe distance minimum by 20%. I would add some logic so that if a bridge mitigation has been noted on a property, the values used in the rule evaluation would be reflected accordingly. 
- There is some funkiness with the applied bridge mitigations logic I would address - the count for applied bridge mitigations will not show if the rule relevant to that mitigation was not involved in the evaluation
- I would add real user auth, users should have to log in and their account will be assigned roles, so that underwriters cannot edit rules in the way that science users are able to etc.
- I would explore the option of LLM-generated human-readable text to explain a rule. The current version does provide the human-written description, but the logic string itself is still not very straightforward and has artefacts of its JSON past life.
- I would make testing rules more robust - add a suite of readily available observations that the science user can run and provide the ability to write an expected output so that tests can be run automatically in large batches.
- I would love to explore a flow graph-based approach to writing new rules. Although out of scope for this project, I think it would be a very cool way to have non-code users construct complex logic. It could also play into how rules are tested. I used Loveable to generate an xyflow interface that felt very fluid and easy to use, so I'd be excited to get something like that connected to a rule construction engine. 
- I have my observation schema on the frontend only, since I first used it to dynamically generate the input form. Ideally, I would have this observation schema stored in the backend instead. The backend should be responsible for validating the observation object as it comes in, which it currently does not do. This opens a security risk and a pathway for bugged behavior. On mount the frontend can make a call to request this resource to generate the form.
- I would update the observation schema - the name and ID are the same right now, should use the id interally and the name extrenally. There was a bug with using the ID, and in the interest of time I just squashed it by just making ID/name the same - future work would have a unique tack-sep ID that is used in code, and the name is used for UI display.
- I would make a better reusable component for displaying the vulnerabilites and mitigations that I can use in the vulnerability lookup tool as well as the evaluation and rule testing tools. 
