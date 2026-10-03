
const STORAGE_KEY = "THE FERN_bookings_v1";

const $ = (id) => document.getElementById(id);

const form = $("bookingForm");
const panel = $("bookingPanel");
const table = $("bookingTable");

let bookings = loadBookings();
let toastTimer;

// ---------- DATA STORAGE ----------

function loadBookings() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(data)) return [];

    return data.filter((b) =>
      b &&
      typeof b.id === "string" &&
      typeof b.name === "string" &&
      typeof b.checkIn === "string" &&
      typeof b.checkOut === "string" &&
      Number.isFinite(b.price) &&
      Number.isFinite(b.guests) &&
      ["Confirmed", "Checked In", "Checked Out", "Cancelled"].includes(b.status) &&
      ["Pending", "Paid", "Partially Paid"].includes(b.payment)
    );
  } catch {
    return [];
  }
}

function saveBookings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    return true;
  } catch {
    showToast("Could not save data. Browser storage may be full.");
    return false;
  }
}

// ---------- UTILITY FUNCTIONS ----------

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(amount) {
  return "₹" + amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2
  });
}

function nightsBetween(start, end) {
  const a = new Date(start + "T00:00:00Z");
  const b = new Date(end + "T00:00:00Z");

  return Math.round((b - a) / 86400000);
}

function formatDate(date) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function makeBookingId() {
  let id;

  do {
    id = "GS-" + Date.now().toString(36).toUpperCase() +
      "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (bookings.some((b) => b.id === id));

  return id;
}

function showToast(message) {
  const toast = $("toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function getBookingTotal(booking) {
  return nightsBetween(booking.checkIn, booking.checkOut) * booking.price;
}

// ---------- PRICE CALCULATION ----------

function updatePricePreview() {
  const checkIn = $("checkIn").value;
  const checkOut = $("checkOut").value;
  const price = Number($("price").value);

  const nights = checkIn && checkOut
    ? nightsBetween(checkIn, checkOut)
    : 0;

  if (nights > 0 && price > 0 && Number.isFinite(price)) {
    $("estimatedTotal").textContent = money(nights * price);

    $("priceBreakdown").textContent =
      `${nights} night${nights === 1 ? "" : "s"} × ${money(price)} per night`;
  } else {
    $("estimatedTotal").textContent = "₹0";
    $("priceBreakdown").textContent =
      "Select valid dates and price to calculate";
  }
}

["checkIn", "checkOut", "price"].forEach((id) => {
  $(id).addEventListener("input", updatePricePreview);
});

function updateDateMinimums() {
  const today = new Date();

  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  $("checkIn").min = localToday;
  $("checkOut").min = $("checkIn").value || localToday;
}

$("checkIn").addEventListener("change", () => {
  $("checkOut").min = $("checkIn").value || $("checkIn").min;

  if ($("checkOut").value && $("checkOut").value <= $("checkIn").value) {
    $("checkOut").value = "";
  }

  updatePricePreview();
});

// ---------- OPEN AND CLOSE FORM ----------

function openForm(booking = null) {
  form.reset();
  updateDateMinimums();

  $("bookingId").value = booking ? booking.id : "";

  $("formTitle").textContent = booking
    ? "Update booking"
    : "Create a booking";

  $("formEyebrow").textContent = booking
    ? "EDIT RESERVATION"
    : "RESERVATION DETAILS";

  $("saveBtn").textContent = booking
    ? "Update Booking"
    : "Save Booking";

  if (booking) {
    $("guestName").value = booking.name;
    $("email").value = booking.email;
    $("phone").value = booking.phone;
    $("roomType").value = booking.roomType;
    $("checkIn").value = booking.checkIn;
    $("checkOut").value = booking.checkOut;
    $("guests").value = booking.guests;
    $("price").value = booking.price;
    $("status").value = booking.status;
    $("payment").value = booking.payment;
  }

  updatePricePreview();
  updateDateMinimums();

  panel.classList.add("open");

  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  if (!booking) {
    $("guestName").focus({ preventScroll: true });
  }
}

function closeForm() {
  panel.classList.remove("open");
  form.reset();

  $("bookingId").value = "";

  updatePricePreview();
  updateDateMinimums();
}

$("addBookingBtn").addEventListener("click", () => openForm());
$("closeFormBtn").addEventListener("click", closeForm);
$("cancelFormBtn").addEventListener("click", closeForm);

// ---------- CREATE AND UPDATE BOOKINGS ----------

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const id = $("bookingId").value;
  const checkIn = $("checkIn").value;
  const checkOut = $("checkOut").value;
  const price = Number($("price").value);
  const guests = Number($("guests").value);

  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const name = $("guestName").value.trim();
  const roomType = $("roomType").value;

  if (!name || !email || !phone) {
    showToast("Please complete all guest details.");
    return;
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    showToast("Enter a valid 10-digit phone number.");
    return;
  }

  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(guests) ||
    guests < 1 ||
    guests > 20
  ) {
    showToast("Enter a valid price and guest count.");
    return;
  }

  if (
    !checkIn ||
    !checkOut ||
    nightsBetween(checkIn, checkOut) <= 0
  ) {
    showToast("Check-out must be after check-in.");
    return;
  }

  // Check for overlapping bookings of the same room type.

  const conflict = bookings.some((b) => {
    if (b.id === id || b.status === "Cancelled") return false;
    if (b.roomType !== roomType) return false;

    return checkIn < b.checkOut && checkOut > b.checkIn;
  });

  if (conflict) {
    showToast("These dates overlap an existing booking for this room type.");
    return;
  }

  const previous = id
    ? bookings.find((b) => b.id === id)
    : null;

  const booking = {
    id: id || makeBookingId(),
    name,
    email,
    phone,
    roomType,
    checkIn,
    checkOut,
    guests,
    price,
    status: $("status").value,
    payment: $("payment").value,
    createdAt: previous
      ? previous.createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const oldBookings = [...bookings];

  if (previous) {
    bookings = bookings.map((b) =>
      b.id === id ? booking : b
    );
  } else {
    bookings.unshift(booking);
  }

  if (!saveBookings()) {
    bookings = oldBookings;
    return;
  }

  closeForm();
  renderBookings(booking.id);

  showToast(
    previous
      ? "Booking updated successfully."
      : "New booking added."
  );
});

// ---------- STATUS STYLING ----------

function statusClass(status) {
  return {
    "Confirmed": "confirmed",
    "Checked In": "checked-in",
    "Checked Out": "checked-out",
    "Cancelled": "cancelled",
    "Paid": "paid",
    "Pending": "pending",
    "Partially Paid": "partially-paid"
  }[status] || "";
}

// ---------- DISPLAY BOOKINGS ----------

function renderBookings(animatedId = null) {
  const query = $("searchInput").value.trim().toLowerCase();
  const filter = $("statusFilter").value;

  const filtered = bookings.filter((b) => {
    const matchesSearch = [b.id, b.name, b.email, b.phone]
      .some((value) =>
        String(value).toLowerCase().includes(query)
      );

    return matchesSearch &&
      (filter === "All" || b.status === filter);
  });

  // Update dashboard statistics.

  $("bookingCount").textContent = filtered.length;
  $("totalBookings").textContent = bookings.length;

  $("confirmedBookings").textContent =
    bookings.filter((b) => b.status === "Confirmed").length;

  $("checkedInBookings").textContent =
    bookings.filter((b) => b.status === "Checked In").length;

  const revenue = bookings
    .filter((b) => b.status !== "Cancelled")
    .reduce((sum, b) => sum + getBookingTotal(b), 0);

  $("totalRevenue").textContent = money(revenue);

  // Display an empty message when no bookings match.

  if (filtered.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="7" class="empty-cell">
          <strong>
            ${bookings.length
              ? "No matching bookings"
              : "No reservations yet"}
          </strong>
          ${bookings.length
            ? "Try changing your search or status filter."
            : "Create your first booking to get started."}
        </td>
      </tr>
    `;

    $("tableNote").textContent =
      "Bookings are saved in this browser.";

    return;
  }

  // Generate table rows.

  table.innerHTML = filtered.map((b) => {
    const nights = nightsBetween(b.checkIn, b.checkOut);
    const total = getBookingTotal(b);

    return `
      <tr class="${b.id === animatedId ? "row-enter" : ""}">
        <td>
          <span class="booking-id">
            ${escapeHTML(b.id)}
          </span>

          <div class="guest-name">
            ${escapeHTML(b.name)}
          </div>

          <div class="guest-email">
            ${escapeHTML(b.email)}
          </div>
        </td>

        <td>
          <strong>${escapeHTML(b.roomType)}</strong>

          <div class="subtext">
            ${b.guests} guest${b.guests === 1 ? "" : "s"}
          </div>
        </td>

        <td>
          <div>${escapeHTML(formatDate(b.checkIn))}</div>

          <div class="subtext">
            to ${escapeHTML(formatDate(b.checkOut))}
          </div>

          <div class="subtext">
            ${nights} night${nights === 1 ? "" : "s"}
          </div>
        </td>

        <td>
          <div class="money">${money(total)}</div>

          <div class="subtext">
            ${money(b.price)}/night
          </div>
        </td>

        <td>
          <select
            class="status-update"
            data-id="${escapeHTML(b.id)}"
            aria-label="Update status for ${escapeHTML(b.name)}"
          >
            <option value="Confirmed"
              ${b.status === "Confirmed" ? "selected" : ""}>
              Confirmed
            </option>

            <option value="Checked In"
              ${b.status === "Checked In" ? "selected" : ""}>
              Checked In
            </option>

            <option value="Checked Out"
              ${b.status === "Checked Out" ? "selected" : ""}>
              Checked Out
            </option>

            <option value="Cancelled"
              ${b.status === "Cancelled" ? "selected" : ""}>
              Cancelled
            </option>
          </select>
        </td>

        <td>
          <span class="badge ${statusClass(b.payment)}">
            ${escapeHTML(b.payment)}
          </span>
        </td>

        <td>
          <div class="actions">
            <button
              class="action-btn edit-btn"
              data-action="edit"
              data-id="${escapeHTML(b.id)}"
            >
              Edit
            </button>

            <button
              class="action-btn delete-btn"
              data-action="delete"
              data-id="${escapeHTML(b.id)}"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  $("tableNote").textContent =
    `Showing ${filtered.length} of ${bookings.length} reservation(s). Data is stored in this browser.`;
}

// ---------- EDIT AND DELETE BOOKINGS ----------

table.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const booking = bookings.find((b) =>
    b.id === button.dataset.id
  );

  if (!booking) return;

  if (button.dataset.action === "edit") {
    openForm(booking);
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm(
      `Delete booking ${booking.id} for ${booking.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    const oldBookings = [...bookings];

    bookings = bookings.filter((b) => b.id !== booking.id);

    if (!saveBookings()) {
      bookings = oldBookings;
      return;
    }

    renderBookings();

    showToast("Booking deleted successfully.");
  }
});

// ---------- BOOKING STATUS UPDATE ----------

table.addEventListener("change", function(event) {
  if (!event.target.classList.contains("status-update")) {
    return;
  }

  const id = event.target.dataset.id;
  const newStatus = event.target.value;

  const validStatuses = [
    "Confirmed",
    "Checked In",
    "Checked Out",
    "Cancelled"
  ];

  if (!validStatuses.includes(newStatus)) {
    renderBookings();
    return;
  }

  const booking = bookings.find(function(b) {
    return b.id === id;
  });

  if (booking) {
    const oldStatus = booking.status;

    booking.status = newStatus;
    booking.updatedAt = new Date().toISOString();

    if (saveBookings()) {
      renderBookings();
      showToast("Booking status updated successfully.");
    } else {
      booking.status = oldStatus;
      renderBookings();
    }
  }
});

// ---------- SEARCH AND FILTER ----------

$("searchInput").addEventListener("input", function() {
  renderBookings();
});

$("statusFilter").addEventListener("change", function() {
  renderBookings();
});

// ---------- INITIALIZE PROJECT ----------

updateDateMinimums();
renderBookings();

 // ---------- ROOM AVAILABILITY ----------

const roomInventory = [
  { type: "Standard", name: "Standard Room", price: 1500, total: 10 },
  { type: "Deluxe", name: "Deluxe Room", price: 2500, total: 10 },
  { type: "Suite", name: "Luxury Suite", price: 5000, total: 10 },
  { type: "Family", name: "Family Room", price: 3500, total: 10 }
];

function displayAvailableRooms() {
  const checkIn = $("availabilityCheckIn").value;
  const checkOut = $("availabilityCheckOut").value;
  const roomContainer = $("availableRooms");

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    roomContainer.innerHTML =
      '<p class="table-note">Please select valid check-in and check-out dates.</p>';
    return;
  }

  let html = "";

  roomInventory.forEach(function(room) {
    // Find bookings that overlap the selected dates.
    const bookedRooms = bookings.filter(function(booking) {
      return booking.roomType === room.type &&
        booking.status !== "Cancelled" &&
        checkIn < booking.checkOut &&
        checkOut > booking.checkIn;
    }).length;

    const available = Math.max(0, room.total - bookedRooms);

    html += `
      <div class="room-card">
        <div class="room-icon">🛏️</div>
        <h4>${room.name}</h4>
        <p>${room.total} rooms in total</p>
        <strong>₹${room.price.toLocaleString("en-IN")} / night</strong>

        <span class="${available > 0 ? "room-available" : "room-unavailable"}">
          ${available > 0
            ? available + " Rooms Available"
            : "Fully Booked"}
        </span>
      </div>
    `;
  });

  roomContainer.innerHTML = html;
}

$("checkRoomsBtn").addEventListener("click", displayAvailableRooms);

// Refresh availability when bookings change.
const originalRenderBookings = renderBookings;

renderBookings = function(animatedId = null) {
  originalRenderBookings(animatedId);

  const checkIn = $("availabilityCheckIn").value;
  const checkOut = $("availabilityCheckOut").value;

  if (checkIn && checkOut && checkOut > checkIn) {
    displayAvailableRooms();
  }
};
