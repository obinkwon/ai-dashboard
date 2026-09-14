const API_URL =
    "https://huggingface.co/api/models";


const modelList =
    document.getElementById("modelList");

const loading =
    document.getElementById("loading");

const error =
    document.getElementById("error");

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const refreshButton =
    document.getElementById("refreshButton");

const sectionTitle =
    document.getElementById("sectionTitle");


let currentFilter = "all";


async function loadModels() {

    showLoading();

    try {

        const params =
            new URLSearchParams({
                sort: "downloads",
                direction: "-1",
                limit: "20"
            });


        if (currentFilter !== "all") {

            params.append(
                "pipeline_tag",
                currentFilter
            );

        }


        const response =
            await fetch(
                `${API_URL}?${params.toString()}`
            );


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );

        }


        const models =
            await response.json();


        renderModels(models);


    } catch (e) {

        showError(
            "Hugging Face API를 가져오지 못했습니다."
        );

        console.error(e);

    } finally {

        hideLoading();

    }
}


async function searchModels() {

    const keyword =
        searchInput.value.trim();


    if (!keyword) {

        loadModels();

        return;
    }


    showLoading();


    try {

        const params =
            new URLSearchParams({

                search: keyword,

                sort: "downloads",

                direction: "-1",

                limit: "20"

            });


        const response =
            await fetch(
                `${API_URL}?${params.toString()}`
            );


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );

        }


        const models =
            await response.json();


        sectionTitle.textContent =
            `🔍 "${keyword}" 검색 결과`;


        renderModels(models);


    } catch (e) {

        showError(
            "검색 중 오류가 발생했습니다."
        );

        console.error(e);

    } finally {

        hideLoading();

    }
}


function renderModels(models) {

    modelList.innerHTML = "";


    if (!models.length) {

        modelList.innerHTML = `
            <p>
                검색 결과가 없습니다.
            </p>
        `;

        return;
    }


    models.forEach((model, index) => {

        const card =
            document.createElement("article");

        card.className = "model-card";


        const downloads =
            formatNumber(
                model.downloads || 0
            );


        const likes =
            formatNumber(
                model.likes || 0
            );


        const tags =
            model.pipeline_tag || "Unknown";


        card.innerHTML = `

            <div class="rank">
                #${index + 1}
            </div>

            <div class="model-name">

                <a
                    href="https://huggingface.co/${model.id}"
                    target="_blank">

                    ${escapeHtml(model.id)}

                </a>

            </div>

            <div class="model-description">

                ${escapeHtml(
                    tags
                )}

            </div>

            <div class="stats">

                <span>
                    ⬇ ${downloads}
                </span>

                <span>
                    ❤️ ${likes}
                </span>

            </div>

        `;


        modelList.appendChild(card);

    });

}


function formatNumber(number) {

    if (number >= 1000000) {

        return (
            (number / 1000000)
                .toFixed(1)
        ) + "M";

    }


    if (number >= 1000) {

        return (
            (number / 1000)
                .toFixed(1)
        ) + "K";

    }


    return number.toString();
}


function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


function showLoading() {

    loading.classList.remove("hidden");

    error.classList.add("hidden");

}


function hideLoading() {

    loading.classList.add("hidden");

}


function showError(message) {

    error.textContent = message;

    error.classList.remove("hidden");

}


searchButton.addEventListener(
    "click",
    searchModels
);


searchInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            searchModels();

        }

    }
);


refreshButton.addEventListener(
    "click",
    () => {

        sectionTitle.textContent =
            "🔥 인기 모델";

        loadModels();

    }
);


document
    .querySelectorAll(".category")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(".category")
                    .forEach(
                        b => b.classList.remove("active")
                    );


                button.classList.add("active");


                currentFilter =
                    button.dataset.filter;


                loadModels();

            }
        );

    });


loadModels();
