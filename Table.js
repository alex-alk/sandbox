import { createComponent } from "./main.js"

export class Table {

    getElement() {
        const html = /* html */`
<div class="p-datatable p-component p-datatable-hoverable p-datatable-gridlines">
    <div class="p-datatable-header">
        <div class="flex justify-between">
            <button class="btn-primary" type="button">
                <span class="p-button-icon p-button-icon-left pi pi-filter-slash"></span>
                <span class="p-button-label">Resetare</span>
            </button>
            <div class="p-iconfield">
                <span class="p-inputicon">
                    <i class="pi pi-search"></i>
                </span>
                <input type="text" class="p-inputtext p-component" placeholder="Cautare" />
            </div>
        </div>
    </div>
    <div class="p-datatable-table-container" style="overflow: auto;">
        <table class="p-datatable-table" style="font-size: medium;">
            <thead class="p-datatable-thead" style="position: sticky;">
                <tr role="row">
                    <th class="p-datatable-header-cell" style="min-width: 12rem;">
                        <div class="p-datatable-column-header-content" >
                            <span class="p-datatable-column-title">Prenume</span>
                            <div class="p-datatable-filter p-datatable-popover-filter">
                                <button class="p-button p-component p-button-icon-only p-button-secondary p-button-rounded p-button-text p-datatable-column-filter-button" type="button">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-button-icon" aria-hidden="true" data-pc-section="filtermenuicon">
                                        <path d="M8.64708 14H5.35296C5.18981 13.9979 5.03395 13.9321 4.91858 13.8167C4.8032 13.7014 4.73745 13.5455 4.73531 13.3824V7L0.329431 0.98C0.259794 0.889466 0.217389 0.780968 0.20718 0.667208C0.19697 0.553448 0.219379 0.439133 0.271783 0.337647C0.324282 0.236453 0.403423 0.151519 0.500663 0.0920138C0.597903 0.0325088 0.709548 0.000692754 0.823548 0H13.1765C13.2905 0.000692754 13.4021 0.0325088 13.4994 0.0920138C13.5966 0.151519 13.6758 0.236453 13.7283 0.337647C13.7807 0.439133 13.8031 0.553448 13.7929 0.667208C13.7826 0.780968 13.7402 0.889466 13.6706 0.98L9.26472 7V13.3824C9.26259 13.5455 9.19683 13.7014 9.08146 13.8167C8.96609 13.9321 8.81022 13.9979 8.64708 14ZM5.97061 12.7647H8.02943V6.79412C8.02878 6.66289 8.07229 6.53527 8.15296 6.43177L11.9412 1.23529H2.05884L5.86355 6.43177C5.94422 6.53527 5.98773 6.66289 5.98708 6.79412L5.97061 12.7647Z" fill="currentColor">
                                        </path>
                                    </svg>
                                    <span class="p-button-label">&nbsp;</span>
                                </button>
                            </div>
                        </div>
                    </th>
                    <th class="p-datatable-header-cell" style="min-width: 12rem;">
                        <div class="p-datatable-column-header-content">
                            <span class="p-datatable-column-title" data-pc-section="columntitle">Nume</span>
                            <div class="p-datatable-filter p-datatable-popover-filter" data-pc-section="filter">
                                <button class="p-button p-component p-button-icon-only p-button-secondary p-button-rounded p-button-text p-datatable-column-filter-button" type="button">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-button-icon" aria-hidden="true" data-pc-section="filtermenuicon">
                                        <path d="M8.64708 14H5.35296C5.18981 13.9979 5.03395 13.9321 4.91858 13.8167C4.8032 13.7014 4.73745 13.5455 4.73531 13.3824V7L0.329431 0.98C0.259794 0.889466 0.217389 0.780968 0.20718 0.667208C0.19697 0.553448 0.219379 0.439133 0.271783 0.337647C0.324282 0.236453 0.403423 0.151519 0.500663 0.0920138C0.597903 0.0325088 0.709548 0.000692754 0.823548 0H13.1765C13.2905 0.000692754 13.4021 0.0325088 13.4994 0.0920138C13.5966 0.151519 13.6758 0.236453 13.7283 0.337647C13.7807 0.439133 13.8031 0.553448 13.7929 0.667208C13.7826 0.780968 13.7402 0.889466 13.6706 0.98L9.26472 7V13.3824C9.26259 13.5455 9.19683 13.7014 9.08146 13.8167C8.96609 13.9321 8.81022 13.9979 8.64708 14ZM5.97061 12.7647H8.02943V6.79412C8.02878 6.66289 8.07229 6.53527 8.15296 6.43177L11.9412 1.23529H2.05884L5.86355 6.43177C5.94422 6.53527 5.98773 6.66289 5.98708 6.79412L5.97061 12.7647Z" fill="currentColor"></path>
                                    </svg>
                                    <span class="p-button-label" data-pc-section="label">&nbsp;</span>
                                </button>
                            </div>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody class="p-datatable-tbody">
                <tr class="p-row-even">
                    <td class="" style="min-width: 12rem;">a</td>
                    <td class="" style="min-width: 12rem;">a</td>
                </tr>
                <tr class="p-row-even">
                    <td class="" style="min-width: 12rem;">a</td>
                    <td class="" style="min-width: 12rem;">a</td>
                </tr>
                <tr class="p-row-even">
                    <td class="" style="min-width: 12rem;">a</td>
                    <td class="" style="min-width: 12rem;">a</td>
                </tr>
                <tr class="p-row-even">
                    <td class="" style="min-width: 12rem;">a</td>
                    <td class="" style="min-width: 12rem;">a</td>
                </tr>
            </tbody>
        </table>
    </div>

    <nav class="p-datatable-paginator-bottom">
        <div class="p-paginator p-component">
            <div class="p-paginator-content">
                <button class="p-paginator-first p-disabled" type="button" disabled="true">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-paginator-first-icon" aria-hidden="true">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M5.71602 11.164C5.80782 11.2021 5.9063 11.2215 6.00569 11.221C6.20216 11.2301 6.39427 11.1612 6.54025 11.0294C6.68191 10.8875 6.76148 10.6953 6.76148 10.4948C6.76148 10.2943 6.68191 10.1021 6.54025 9.96024L3.51441 6.9344L6.54025 3.90855C6.624 3.76126 6.65587 3.59011 6.63076 3.42254C6.60564 3.25498 6.525 3.10069 6.40175 2.98442C6.2785 2.86815 6.11978 2.79662 5.95104 2.7813C5.78229 2.76598 5.61329 2.80776 5.47112 2.89994L1.97123 6.39983C1.82957 6.54167 1.75 6.73393 1.75 6.9344C1.75 7.13486 1.82957 7.32712 1.97123 7.46896L5.47112 10.9991C5.54096 11.0698 5.62422 11.1259 5.71602 11.164ZM11.0488 10.9689C11.1775 11.1156 11.3585 11.2061 11.5531 11.221C11.7477 11.2061 11.9288 11.1156 12.0574 10.9689C12.1815 10.8302 12.25 10.6506 12.25 10.4645C12.25 10.2785 12.1815 10.0989 12.0574 9.96024L9.03158 6.93439L12.0574 3.90855C12.1248 3.76739 12.1468 3.60881 12.1204 3.45463C12.0939 3.30045 12.0203 3.15826 11.9097 3.04765C11.7991 2.93703 11.6569 2.86343 11.5027 2.83698C11.3486 2.81053 11.19 2.83252 11.0488 2.89994L7.51865 6.36957C7.37699 6.51141 7.29742 6.70367 7.29742 6.90414C7.29742 7.1046 7.37699 7.29686 7.51865 7.4387L11.0488 10.9689Z" fill="currentColor">
                        </path>
                    </svg>
                </button>
                <button class="p-paginator-prev p-disabled" type="button" data-pc-section="prev" data-pc-group-section="pagebutton" aria-label="Previous Page" disabled="">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-paginator-prev-icon">
                        <path d="M8.75 11.185C8.65146 11.1854 8.55381 11.1662 8.4628 11.1284C8.37179 11.0906 8.28924 11.0351 8.22 10.965L4.72 7.46496C4.57955 7.32433 4.50066 7.13371 4.50066 6.93496C4.50066 6.73621 4.57955 6.54558 4.72 6.40496L8.22 2.93496C8.36095 2.84357 8.52851 2.80215 8.69582 2.81733C8.86312 2.83252 9.02048 2.90344 9.14268 3.01872C9.26487 3.134 9.34483 3.28696 9.36973 3.4531C9.39463 3.61924 9.36303 3.78892 9.28 3.93496L6.28 6.93496L9.28 9.93496C9.42045 10.0756 9.49934 10.2662 9.49934 10.465C9.49934 10.6637 9.42045 10.8543 9.28 10.995C9.13526 11.1257 8.9448 11.1939 8.75 11.185Z" fill="currentColor">
                        </path>
                    </svg>
                </button>
                <span class="p-paginator-pages">
                    <button class="p-paginator-page p-paginator-page-selected" type="button">1</button>
                </span>
                <button class="p-paginator-next p-disabled" type="button" data-pc-section="next"disabled="">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-paginator-next-icon" aria-hidden="true" data-pc-section="nexticon">
                        <path d="M5.25 11.1728C5.14929 11.1694 5.05033 11.1455 4.9592 11.1025C4.86806 11.0595 4.78666 10.9984 4.72 10.9228C4.57955 10.7822 4.50066 10.5916 4.50066 10.3928C4.50066 10.1941 4.57955 10.0035 4.72 9.86283L7.72 6.86283L4.72 3.86283C4.66067 3.71882 4.64765 3.55991 4.68275 3.40816C4.71785 3.25642 4.79932 3.11936 4.91585 3.01602C5.03238 2.91268 5.17819 2.84819 5.33305 2.83149C5.4879 2.81479 5.64411 2.84671 5.78 2.92283L9.28 6.42283C9.42045 6.56346 9.49934 6.75408 9.49934 6.95283C9.49934 7.15158 9.42045 7.34221 9.28 7.48283L5.78 10.9228C5.71333 10.9984 5.63193 11.0595 5.5408 11.1025C5.44966 11.1455 5.35071 11.1694 5.25 11.1728Z" fill="currentColor">
                        </path>
                    </svg>
                </button><button class="p-paginator-last p-disabled" type="button" disabled="">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class="p-icon p-paginator-last-icon" aria-hidden="true" data-pc-section="lasticon">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M7.68757 11.1451C7.7791 11.1831 7.8773 11.2024 7.9764 11.2019C8.07769 11.1985 8.17721 11.1745 8.26886 11.1312C8.36052 11.088 8.44238 11.0265 8.50943 10.9505L12.0294 7.49085C12.1707 7.34942 12.25 7.15771 12.25 6.95782C12.25 6.75794 12.1707 6.56622 12.0294 6.42479L8.50943 2.90479C8.37014 2.82159 8.20774 2.78551 8.04633 2.80192C7.88491 2.81833 7.73309 2.88635 7.6134 2.99588C7.4937 3.10541 7.41252 3.25061 7.38189 3.40994C7.35126 3.56927 7.37282 3.73423 7.44337 3.88033L10.4605 6.89748L7.44337 9.91463C7.30212 10.0561 7.22278 10.2478 7.22278 10.4477C7.22278 10.6475 7.30212 10.8393 7.44337 10.9807C7.51301 11.0512 7.59603 11.1071 7.68757 11.1451ZM1.94207 10.9505C2.07037 11.0968 2.25089 11.1871 2.44493 11.2019C2.63898 11.1871 2.81949 11.0968 2.94779 10.9505L6.46779 7.49085C6.60905 7.34942 6.68839 7.15771 6.68839 6.95782C6.68839 6.75793 6.60905 6.56622 6.46779 6.42479L2.94779 2.90479C2.80704 2.83757 2.6489 2.81563 2.49517 2.84201C2.34143 2.86839 2.19965 2.94178 2.08936 3.05207C1.97906 3.16237 1.90567 3.30415 1.8793 3.45788C1.85292 3.61162 1.87485 3.76975 1.94207 3.9105L4.95922 6.92765L1.94207 9.9448C1.81838 10.0831 1.75 10.2621 1.75 10.4477C1.75 10.6332 1.81838 10.8122 1.94207 10.9505Z" fill="currentColor">
                        </path>
                    </svg>
                </button>
            </div>
        </div>
    </nav>
</div>
`
        return createComponent(html)
    }
    
}